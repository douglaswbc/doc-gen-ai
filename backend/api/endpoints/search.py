from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Dict
from services.search import search_inss_address, search_jurisprudence, search_jurisdiction_db

router = APIRouter()


class SearchQuery(BaseModel):
    query: str


class JurisdictionQuery(BaseModel):
    municipality: str = Field(..., example="São Paulo")
    state: str = Field(..., example="SP")


@router.post("/jurisprudence")
async def search_laws(data: SearchQuery):
    return await search_jurisprudence(data.query)


@router.post("/inss")
async def search_address(data: SearchQuery):
    return await search_inss_address(data.query)


@router.post("/jurisdiction")
async def search_jurisdiction(data: JurisdictionQuery):
    return await search_jurisdiction_db(data.municipality, data.state)