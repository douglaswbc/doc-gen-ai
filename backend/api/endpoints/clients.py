import os
from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional, List
from pydantic import BaseModel
from supabase import create_client, Client

router = APIRouter()

# Inicializa o Supabase no Python
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)


async def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token de autenticação ausente.")
    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Sessão inválida ou expirada.")
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Acesso negado.")


class ChildPayload(BaseModel):
    name: Optional[str]
    cpf: Optional[str]
    birth_date: Optional[str]


@router.post("/{client_id}/children")
async def upsert_children(client_id: str, children: List[ChildPayload], user_auth = Depends(verify_token)):
    """Substitui as crianças do `client_id` por esse array (insere multiple rows em `client_children`).
    Requer autenticação via header Authorization: Bearer <token>.
    """
    try:
        # Remover children existentes para o cliente
        del_res = supabase.table('client_children').delete().eq('client_id', client_id).execute()
        # Inserir novas crianças (se houver)
        if children and len(children) > 0:
            rows = []
            for c in children:
                rows.append({
                    'client_id': client_id,
                    'name': c.name,
                    'cpf': c.cpf,
                    'birth_date': c.birth_date
                })
            ins_res = supabase.table('client_children').insert(rows).execute()
            if ins_res.error:
                raise Exception(ins_res.error)
            return { 'status': 'ok', 'inserted': len(rows) }
        return { 'status': 'ok', 'inserted': 0 }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
