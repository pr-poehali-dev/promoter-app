'''
Business: Генерация и отправка отчётов о работе промоутеров
Args: event с httpMethod, queryStringParameters
Returns: CSV отчёт или статус отправки
'''

import json
import os
from typing import Dict, Any
from datetime import date
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            route_id = params.get('route_id')
            format_type = params.get('format', 'json')
            
            cursor.execute('''
                SELECT 
                    r.id as route_id,
                    r.route_date,
                    p.name as promoter_name,
                    p.phone as promoter_phone,
                    rp.address,
                    rp.completed,
                    rp.leaflets_distributed,
                    rp.completed_at,
                    rp.photo_url
                FROM routes r
                JOIN promoters p ON r.promoter_id = p.id
                JOIN route_points rp ON r.id = rp.route_id
                WHERE r.id = %s
                ORDER BY rp.point_order
            ''', (route_id,))
            
            data = cursor.fetchall()
            
            if format_type == 'csv':
                if not data:
                    csv_content = 'Нет данных'
                else:
                    csv_lines = ['Дата,Промоутер,Телефон,Адрес,Выполнено,Листовок,Время выполнения,Фото']
                    
                    for row in data:
                        csv_lines.append(','.join([
                            str(row['route_date']),
                            row['promoter_name'],
                            row['promoter_phone'] or '',
                            f'"{row["address"]}"',
                            'Да' if row['completed'] else 'Нет',
                            str(row['leaflets_distributed'] or 0),
                            str(row['completed_at']) if row['completed_at'] else '',
                            row['photo_url'] or ''
                        ]))
                    
                    csv_content = '\n'.join(csv_lines)
                
                cursor.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'text/csv; charset=utf-8',
                        'Access-Control-Allow-Origin': '*',
                        'Content-Disposition': f'attachment; filename="report_{route_id}.csv"'
                    },
                    'body': csv_content
                }
            else:
                result = [dict(row) for row in data]
                for row in result:
                    row['route_date'] = str(row['route_date'])
                    row['completed_at'] = str(row['completed_at']) if row['completed_at'] else None
                
                cursor.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps(result, ensure_ascii=False)
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            route_id = body_data.get('route_id')
            
            cursor.execute('''
                SELECT 
                    r.id,
                    r.route_date,
                    r.total_points,
                    r.completed_points,
                    r.total_leaflets,
                    p.name as promoter_name
                FROM routes r
                JOIN promoters p ON r.promoter_id = p.id
                WHERE r.id = %s
            ''', (route_id,))
            
            route = cursor.fetchone()
            
            if route:
                cursor.execute('''
                    INSERT INTO daily_reports 
                    (route_id, report_date, total_points, completed_points, total_leaflets, report_data)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                ''', (
                    route_id,
                    route['route_date'],
                    route['total_points'],
                    route['completed_points'],
                    route['total_leaflets'],
                    json.dumps(dict(route), default=str)
                ))
                
                report_id = cursor.fetchone()['id']
                conn.commit()
                
                result = {
                    'report_id': report_id,
                    'status': 'sent',
                    'summary': {
                        'promoter': route['promoter_name'],
                        'date': str(route['route_date']),
                        'completed': route['completed_points'],
                        'total': route['total_points'],
                        'leaflets': route['total_leaflets']
                    }
                }
            else:
                result = {'error': 'Route not found'}
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(result, ensure_ascii=False)
            }
        
        else:
            return {
                'statusCode': 405,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Method not allowed'})
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }
