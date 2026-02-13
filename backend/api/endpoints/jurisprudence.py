import os
from fastapi import APIRouter, HTTPException, Header, Depends, UploadFile, File
from typing import Optional, List
from pydantic import BaseModel
from supabase import create_client, Client
import csv
import io

router = APIRouter()

# Inicializa o Supabase no Python
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)


async def verify_admin(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token de autenticação ausente.")
    try:
        token = authorization.split(" ")[1]
        user_res = supabase.auth.get_user(token)
        # extract user id robustly
        user_id = None
        try:
            user_id = getattr(user_res, 'data', None) and getattr(user_res.data, 'user', None) and user_res.data.user.id
        except Exception:
            try:
                user_id = (user_res or {}).get('data', {}).get('user', {}).get('id')
            except Exception:
                user_id = None
        if not user_id:
            raise HTTPException(status_code=401, detail="Sessão inválida ou expirada.")
        # check profile role
        prof = supabase.table('profiles').select('role').eq('id', user_id).single().execute()
        role = None
        try:
            role = getattr(prof, 'data', None) and getattr(prof.data, 'role', None)
        except Exception:
            try:
                role = (prof or {}).get('data', {}).get('role')
            except Exception:
                role = None
        if role != 'admin':
            raise HTTPException(status_code=403, detail='Admin role required')
        return user_id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Acesso negado.")


class JurisModel(BaseModel):
    title: str
    citation: Optional[str]
    court: Optional[str]
    date: Optional[str]
    summary: Optional[str]
    full_text: Optional[str]
    tags: Optional[List[str]]
    source_url: Optional[str]


def extract_error(resp):
    if resp is None:
        return None
    err = None
    try:
        err = getattr(resp, 'error', None)
    except Exception:
        err = None
    if not err and isinstance(resp, dict):
        err = resp.get('error')
    return err


@router.post('/')
async def create_juris(j: JurisModel, user=Depends(verify_admin)):
    try:
        payload = j.dict()
        res = supabase.table('jurisprudences').insert([payload]).execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        return { 'status': 'ok' }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/')
async def list_juris(q: Optional[str] = None, tags: Optional[str] = None, court: Optional[str] = None, limit: int = 20):
    try:
        query = supabase.table('jurisprudences').select('*')
        if q:
            # simple ilike on title and summary
            query = query.ilike('title', f'%{q}%')
        if tags:
            # tags comma separated
            tag_list = [t.strip() for t in tags.split(',') if t.strip()]
            if tag_list:
                query = query.contains('tags', tag_list)
        if court:
            query = query.eq('court', court)
        query = query.limit(limit)
        res = query.execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        # return data payload
        data = None
        try:
            data = getattr(res, 'data', None)
        except Exception:
            data = (res or {}).get('data')
        return data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/{id}')
async def get_juris(id: str):
    try:
        res = supabase.table('jurisprudences').select('*').eq('id', id).single().execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        try:
            return getattr(res, 'data', None)
        except Exception:
            return (res or {}).get('data')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch('/{id}')
async def update_juris(id: str, j: JurisModel, user=Depends(verify_admin)):
    try:
        res = supabase.table('jurisprudences').update(j.dict()).eq('id', id).execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        return { 'status': 'ok' }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete('/{id}')
async def delete_juris(id: str, user=Depends(verify_admin)):
    try:
        res = supabase.table('jurisprudences').delete().eq('id', id).execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        return { 'status': 'ok' }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/import')
async def import_csv(file: UploadFile = File(...), user=Depends(verify_admin)):
    try:
        content = await file.read()
        s = content.decode('utf-8')
        reader = csv.DictReader(io.StringIO(s))
        inserted = 0
        for row in reader:
            payload = {
                'title': row.get('title') or row.get('Title'),
                'citation': row.get('citation'),
                'court': row.get('court'),
                'date': row.get('date'),
                'summary': row.get('summary'),
                'full_text': row.get('full_text') or row.get('fullText'),
                'tags': [t.strip() for t in (row.get('tags') or '').split(';') if t.strip()],
                'source_url': row.get('source_url')
            }
            # naive insert
            res = supabase.table('jurisprudences').insert([payload]).execute()
            err = extract_error(res)
            if err:
                # skip problematic row
                print('Import row error:', err)
                continue
            inserted += 1
        return { 'status': 'ok', 'inserted': inserted }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
