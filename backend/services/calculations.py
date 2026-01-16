from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from num2words import num2words

# Dados históricos (Cópia fiel do seu TS)
SALARY_HISTORY = [
    { "vigencia": '2026-01-01', "valor": 1621.00, "reajuste": 6.79 },
    { "vigencia": '2025-01-01', "valor": 1518.00, "reajuste": 7.95 },
    { "vigencia": '2024-01-01', "valor": 1412.00, "reajuste": 6.97 },
    { "vigencia": '2023-05-01', "valor": 1320.00, "reajuste": 8.90 },
    { "vigencia": '2023-01-01', "valor": 1302.00, "reajuste": 7.43 },
    { "vigencia": '2022-01-01', "valor": 1212.00, "reajuste": 10.16 },
    { "vigencia": '2021-01-01', "valor": 1100.00, "reajuste": 5.26 },
    { "vigencia": '2020-02-01', "valor": 1045.00, "reajuste": 0.58 },
    { "vigencia": '2020-01-01', "valor": 1039.00, "reajuste": 4.10 },
    { "vigencia": '2019-01-01', "valor": 998.00, "reajuste": 4.61 },
    { "vigencia": '2018-01-01', "valor": 954.00, "reajuste": 1.81 },
    { "vigencia": '2017-01-01', "valor": 937.00, "reajuste": 6.48 },
    { "vigencia": '2016-01-01', "valor": 880.00, "reajuste": 11.68 },
    { "vigencia": '2015-01-01', "valor": 788.00, "reajuste": 8.84 },
    { "vigencia": '2014-01-01', "valor": 724.00, "reajuste": 6.78 },
    { "vigencia": '2013-01-01', "valor": 678.00, "reajuste": 9.00 },
    { "vigencia": '2012-01-01', "valor": 622.00, "reajuste": 14.13 },
    { "vigencia": '2011-03-01', "valor": 545.00, "reajuste": 0.93 },
    { "vigencia": '2011-01-01', "valor": 540.00, "reajuste": 5.88 },
    { "vigencia": '2010-01-01', "valor": 510.00, "reajuste": 9.68 },
    { "vigencia": '2009-02-01', "valor": 465.00, "reajuste": 12.05 },
    { "vigencia": '2008-03-01', "valor": 415.00, "reajuste": 9.21 },
    { "vigencia": '2007-04-01', "valor": 380.00, "reajuste": 8.57 },
    { "vigencia": '2006-04-01', "valor": 350.00, "reajuste": 16.67 },
    { "vigencia": '2005-05-01', "valor": 300.00, "reajuste": 15.38 },
    { "vigencia": '2004-05-01', "valor": 260.00, "reajuste": 8.33 },
    { "vigencia": '2003-06-01', "valor": 240.00, "reajuste": 20.00 },
    { "vigencia": '2002-06-01', "valor": 200.00, "reajuste": 11.11 },
    { "vigencia": '2001-06-01', "valor": 180.00, "reajuste": 19.21 },
    { "vigencia": '2000-06-01', "valor": 151.00, "reajuste": 11.03 },
    { "vigencia": '1999-05-01', "valor": 136.00, "reajuste": 4.62 },
    { "vigencia": '1998-05-01', "valor": 130.00, "reajuste": 8.33 },
    { "vigencia": '1997-05-01', "valor": 120.00, "reajuste": 7.14 },
    { "vigencia": '1996-05-01', "valor": 112.00, "reajuste": 12.00 },
    { "vigencia": '1995-05-01', "valor": 100.00, "reajuste": 42.86 },
    { "vigencia": '1994-09-01', "valor": 70.00, "reajuste": 8.04 },
    { "vigencia": '1994-07-01', "valor": 64.79, "reajuste": 0 },
]

def parse_date(date_input):
    if isinstance(date_input, str):
        try:
            return datetime.strptime(date_input, "%Y-%m-%d").date()
        except ValueError:
            return datetime.now().date()
    return date_input

def get_salary_for_date(target_date):
    target = parse_date(target_date)
    
    for salary in SALARY_HISTORY:
        vigencia = datetime.strptime(salary["vigencia"], "%Y-%m-%d").date()
        if target >= vigencia:
            return salary["valor"]
            
    return SALARY_HISTORY[-1]["valor"]

def calculate_adjusted_value(base_value, base_date):
    base_dt = parse_date(base_date)
    today = datetime.now().date()
    
    adjusted_value = float(base_value)
    
    for salary in SALARY_HISTORY:
        vigencia = datetime.strptime(salary["vigencia"], "%Y-%m-%d").date()
        
        # Lógica original: Se vigência > data_base e vigência <= hoje
        if vigencia > base_dt and vigencia <= today:
            adjusted_value = adjusted_value * (1 + salary["reajuste"] / 100)
            
    return round(adjusted_value, 2)

def generate_payment_table(birth_date_str: str, months=4):
    if not birth_date_str:
        return [], 0.0

    birth_date = parse_date(birth_date_str)
    table = []
    total_reajustado = 0.0
    
    month_names = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    
    for i in range(months):
        # Soma meses à data
        competencia_date = birth_date + relativedelta(months=+i)
        
        valor_base = get_salary_for_date(competencia_date)
        valor_reajustado = calculate_adjusted_value(valor_base, competencia_date)
        
        total_reajustado += valor_reajustado
        
        month_name = month_names[competencia_date.month - 1]
        competencia_str = f"{month_name}/{competencia_date.year}"
        
        table.append({
            "competencia": competencia_str,
            "valor_base": valor_base,
            "valor_reajustado": valor_reajustado
        })
        
    return table, round(total_reajustado, 2)

def get_valor_extenso(valor: float) -> str:
    return num2words(valor, lang='pt_BR', to='currency')