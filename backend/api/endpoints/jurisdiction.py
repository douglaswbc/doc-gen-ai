import os
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional, List
from supabase import create_client, Client
import csv
import io
import os
from fastapi import UploadFile, File
try:
    import openpyxl
except Exception:
    openpyxl = None

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


class SectionModel(BaseModel):
    name: str
    code: str
    trf: str


class SubsectionModel(BaseModel):
    section_id: str
    name: str
    city: str
    has_jef: Optional[bool] = True


class MunicipalityModel(BaseModel):
    name: str
    state: str
    ibge_code: Optional[str]


class JurisdictionMapModel(BaseModel):
    municipality_id: str
    subsection_id: str
    legal_basis: str


@router.post('/sections')
async def create_section(s: SectionModel, user=Depends(verify_admin)):
    try:
        res = supabase.table('judicial_sections').insert([s.dict()]).execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        return { 'status': 'ok' }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/sections')
async def list_sections(q: Optional[str] = None):
    try:
        query = supabase.table('judicial_sections').select('*')
        if q:
            query = query.ilike('name', f'%{q}%')
        res = query.execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        try:
            return getattr(res, 'data', None) or []
        except Exception:
            return (res or {}).get('data', [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch('/sections/{id}')
async def update_section(id: str, s: SectionModel, user=Depends(verify_admin)):
    try:
        res = supabase.table('judicial_sections').update(s.dict()).eq('id', id).execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        return { 'status': 'ok' }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete('/sections/{id}')
async def delete_section(id: str, user=Depends(verify_admin)):
    try:
        res = supabase.table('judicial_sections').delete().eq('id', id).execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        return { 'status': 'ok' }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/subsections')
async def create_subsection(s: SubsectionModel, user=Depends(verify_admin)):
    try:
        res = supabase.table('judicial_subsections').insert([s.dict()]).execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        return { 'status': 'ok' }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/subsections')
async def list_subsections(section_id: Optional[str] = None, q: Optional[str] = None):
    try:
        # Include parent section data for hierarchical UI
        sel = '*, section:section_id(name,code,trf)'
        query = supabase.table('judicial_subsections').select(sel)
        if section_id:
            query = query.eq('section_id', section_id)
        if q:
            query = query.ilike('name', f'%{q}%')
        res = query.execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        try:
            return getattr(res, 'data', None) or []
        except Exception:
            return (res or {}).get('data', [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/subsections/{id}')
async def get_subsection(id: str):
    try:
        # subsection with parent section
        sel = '*, section:section_id(id,name,code,trf)'
        res = supabase.table('judicial_subsections').select(sel).eq('id', id).single().execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        try:
            subsection = getattr(res, 'data', None)
        except Exception:
            subsection = (res or {}).get('data')

        if not subsection:
            raise HTTPException(status_code=404, detail='Subsection not found')

        # fetch mapped municipalities for this subsection
        map_sel = 'id, legal_basis, municipality:municipality_id(id,name,state,ibge_code,created_at)'
        maps_res = supabase.table('jurisdiction_map').select(map_sel).eq('subsection_id', id).execute()
        err2 = extract_error(maps_res)
        if err2:
            raise Exception(err2)
        try:
            maps = getattr(maps_res, 'data', None) or []
        except Exception:
            maps = (maps_res or {}).get('data', [])

        # return subsection with a municipalities array (each includes municipality object and legal_basis)
        municipalities = []
        for m in maps:
            municipalities.append({ 'map_id': m.get('id'), 'legal_basis': m.get('legal_basis'), 'municipality': m.get('municipality') })

        return { 'subsection': subsection, 'municipalities': municipalities }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/subsections/{id}/municipalities')
async def list_municipalities_by_subsection(id: str):
    try:
        map_sel = 'id, legal_basis, municipality:municipality_id(id,name,state,ibge_code,created_at)'
        maps_res = supabase.table('jurisdiction_map').select(map_sel).eq('subsection_id', id).execute()
        err = extract_error(maps_res)
        if err:
            raise Exception(err)
        try:
            maps = getattr(maps_res, 'data', None) or []
        except Exception:
            maps = (maps_res or {}).get('data', [])

        municipalities = [ { 'map_id': m.get('id'), 'legal_basis': m.get('legal_basis'), 'municipality': m.get('municipality') } for m in maps ]
        return municipalities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch('/subsections/{id}')
async def update_subsection(id: str, s: SubsectionModel, user=Depends(verify_admin)):
    try:
        res = supabase.table('judicial_subsections').update(s.dict()).eq('id', id).execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        return { 'status': 'ok' }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete('/subsections/{id}')
async def delete_subsection(id: str, user=Depends(verify_admin)):
    try:
        res = supabase.table('judicial_subsections').delete().eq('id', id).execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        return { 'status': 'ok' }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/municipalities')
async def create_municipality(m: MunicipalityModel, user=Depends(verify_admin)):
    try:
        res = supabase.table('municipalities').insert([m.dict()]).execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        return { 'status': 'ok' }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/municipalities')
async def list_municipalities(state: Optional[str] = None, q: Optional[str] = None):
    try:
        query = supabase.table('municipalities').select('*')
        if state:
            query = query.eq('state', state)
        if q:
            query = query.ilike('name', f'%{q}%')
        res = query.execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        try:
            return getattr(res, 'data', None) or []
        except Exception:
            return (res or {}).get('data', [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch('/municipalities/{id}')
async def update_municipality(id: str, m: MunicipalityModel, user=Depends(verify_admin)):
    try:
        res = supabase.table('municipalities').update(m.dict()).eq('id', id).execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        return { 'status': 'ok' }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete('/municipalities/{id}')
async def delete_municipality(id: str, user=Depends(verify_admin)):
    try:
        res = supabase.table('municipalities').delete().eq('id', id).execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        return { 'status': 'ok' }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/maps')
async def create_map(m: JurisdictionMapModel, user=Depends(verify_admin)):
    try:
        res = supabase.table('jurisdiction_map').insert([m.dict()]).execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        return { 'status': 'ok' }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/maps')
async def list_maps(q: Optional[str] = None, state: Optional[str] = None):
    try:
        # Join to return readable names: municipality.name, municipality.state, subsection.name, subsection.city
        sel = 'id, legal_basis, created_at, municipality:municipality_id(name,state), subsection:subsection_id(name,city,has_jef)'
        query = supabase.table('jurisdiction_map').select(sel)
        if state:
            query = query.eq('municipality.state', state)
        if q:
            query = query.ilike('municipality.name', f'%{q}%')
        res = query.execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        try:
            return getattr(res, 'data', None) or []
        except Exception:
            return (res or {}).get('data', [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch('/maps/{id}')
async def update_map(id: str, m: JurisdictionMapModel, user=Depends(verify_admin)):
    try:
        res = supabase.table('jurisdiction_map').update(m.dict()).eq('id', id).execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        return { 'status': 'ok' }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete('/maps/{id}')
async def delete_map(id: str, user=Depends(verify_admin)):
    try:
        res = supabase.table('jurisdiction_map').delete().eq('id', id).execute()
        err = extract_error(res)
        if err:
            raise Exception(err)
        return { 'status': 'ok' }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.post('/import')
async def import_jurisdiction(file: UploadFile = File(...), user=Depends(verify_admin)):
    """Import CSV with columns: section, subsection, municipality, state, legal_basis
    Performs idempotent upserts: creates sections, subsections, municipalities and jurisdiction_map entries.
    """
    try:
        content = await file.read()
        filename = getattr(file, 'filename', '') or ''
        rows = []
        # support .xlsx via openpyxl, otherwise expect CSV
        if filename.lower().endswith('.xlsx') or filename.lower().endswith('.xls'):
            if not openpyxl:
                raise HTTPException(status_code=500, detail='openpyxl not installed on server')
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
            ws = wb.active
            it = ws.iter_rows(values_only=True)
            try:
                headers = [str(h).strip() for h in next(it)]
            except StopIteration:
                headers = []
            for r in it:
                obj: dict = {}
                for i, h in enumerate(headers):
                    obj[h] = r[i] if i < len(r) else None
                rows.append(obj)
        else:
            s = content.decode('utf-8')
            reader = csv.DictReader(io.StringIO(s))
            for r in reader:
                rows.append(r)
        inserted = { 'sections': 0, 'subsections': 0, 'municipalities': 0, 'maps': 0, 'updated_maps': 0 }

        for row in rows:
            section_name = (row.get('section') or row.get('Seção') or '').strip()
            subsection_name = (row.get('subsection') or row.get('Subseção') or '').strip()
            municipality_name = (row.get('municipality') or row.get('Município') or '').strip()
            state = (row.get('state') or row.get('UF') or '').strip()
            legal_basis = (row.get('legal_basis') or row.get('legal') or row.get('Base legal') or '').strip()

            if not section_name or not subsection_name or not municipality_name or not state:
                # skip invalid rows
                continue

            # find or create section (by name)
            sec_res = supabase.table('judicial_sections').select('*').ilike('name', section_name).limit(1).execute()
            sec = getattr(sec_res, 'data', None)
            section_id = None
            if sec and len(sec) > 0:
                section_id = sec[0]['id']
            else:
                ins = supabase.table('judicial_sections').insert([{'name': section_name, 'code': section_name[:6].upper(), 'trf': ''}]).execute()
                err = extract_error(ins)
                if err:
                    print('Section insert error:', err)
                else:
                    d = getattr(ins, 'data', None) or (ins or {}).get('data')
                    if d and len(d) > 0:
                        section_id = d[0].get('id')
                        inserted['sections'] += 1

            if not section_id:
                # fallback: skip row
                continue

            # find or create subsection (by section_id + name)
            sub_q = supabase.table('judicial_subsections').select('*').eq('section_id', section_id).ilike('name', subsection_name).limit(1).execute()
            subd = getattr(sub_q, 'data', None) or (sub_q or {}).get('data')
            subsection_id = None
            if subd and len(subd) > 0:
                subsection_id = subd[0].get('id')
            else:
                ins2 = supabase.table('judicial_subsections').insert([{'section_id': section_id, 'name': subsection_name, 'city': subsection_name, 'has_jef': True}]).execute()
                err2 = extract_error(ins2)
                if err2:
                    print('Subsection insert error:', err2)
                else:
                    d2 = getattr(ins2, 'data', None) or (ins2 or {}).get('data')
                    if d2 and len(d2) > 0:
                        subsection_id = d2[0].get('id')
                        inserted['subsections'] += 1

            if not subsection_id:
                continue

            # find or create municipality (by name+state)
            mun_q = supabase.table('municipalities').select('*').eq('state', state).ilike('name', municipality_name).limit(1).execute()
            mund = getattr(mun_q, 'data', None) or (mun_q or {}).get('data')
            municipality_id = None
            if mund and len(mund) > 0:
                municipality_id = mund[0].get('id')
            else:
                ins3 = supabase.table('municipalities').insert([{'name': municipality_name, 'state': state}]).execute()
                err3 = extract_error(ins3)
                if err3:
                    print('Municipality insert error:', err3)
                else:
                    d3 = getattr(ins3, 'data', None) or (ins3 or {}).get('data')
                    if d3 and len(d3) > 0:
                        municipality_id = d3[0].get('id')
                        inserted['municipalities'] += 1

            if not municipality_id:
                continue

            # upsert map: if exists update legal_basis/subsection, else insert
            map_q = supabase.table('jurisdiction_map').select('*').eq('municipality_id', municipality_id).limit(1).execute()
            mapd = getattr(map_q, 'data', None) or (map_q or {}).get('data')
            if mapd and len(mapd) > 0:
                # update
                m_id = mapd[0].get('id')
                upd = supabase.table('jurisdiction_map').update({'subsection_id': subsection_id, 'legal_basis': legal_basis}).eq('id', m_id).execute()
                ierr = extract_error(upd)
                if ierr:
                    print('Map update error:', ierr)
                else:
                    inserted['updated_maps'] += 1
            else:
                insm = supabase.table('jurisdiction_map').insert([{'municipality_id': municipality_id, 'subsection_id': subsection_id, 'legal_basis': legal_basis}]).execute()
                ierr2 = extract_error(insm)
                if ierr2:
                    print('Map insert error:', ierr2)
                else:
                    inserted['maps'] += 1

        return { 'status': 'ok', 'inserted': inserted }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
