from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class AttributeDef(BaseModel):
    name: str
    data_type: str
    is_primary_key: bool = False
    is_not_null: bool = False
    max_length: Optional[int] = None

class EntityDef(BaseModel):
    name: str
    attributes: List[AttributeDef]

class SchemaDefinition(BaseModel):
    project_id: int
    entities: List[EntityDef]

class InsertDataRequest(BaseModel):
    project_id: int
    table_name: str
    data: Dict[str, Any]