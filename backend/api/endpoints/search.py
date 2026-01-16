from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict
from services.search import search_inss_address, search_jurisprudence

router = APIRouter()

class SearchQuery(BaseModel):
    query: str

@router.post("/jurisprudence")
async def search_laws(data: SearchQuery):
    return await search_jurisprudence(data.query)

@router.post("/inss")
async def search_address(data: SearchQuery):
    return await search_inss_address(data.query)