def generate_sql_from_definition(schema):
    sql_statements = []
    for entity in schema.entities:
        cols = []
        for attr in entity.attributes:
            col_def = f"`{attr['name']}` {attr['data_type']}"
            if attr.get('max_length') and attr['data_type'].upper() in ('VARCHAR', 'CHAR'):
                col_def += f"({attr['max_length']})"
            if attr.get('is_primary_key'):
                col_def += " PRIMARY KEY"
            if attr.get('is_not_null'):
                col_def += " NOT NULL"
            cols.append(col_def)
        # Convert entity name to lowercase to avoid case sensitivity issues
        table_name = f"project_{schema.project_id}_{entity['name'].lower()}"
        create_sql = f"CREATE TABLE IF NOT EXISTS `{table_name}` (\n  " + ",\n  ".join(cols) + "\n);"
        sql_statements.append(create_sql)
    return sql_statements

def execute_sql_on_project_db(sql, project_id):
    from database.connection import execute_query
    return execute_query(sql, commit=True)