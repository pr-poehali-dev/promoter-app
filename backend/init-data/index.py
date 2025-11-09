'''
Business: Инициализация тестовых данных для промоутеров
Args: event с httpMethod
Returns: Статус создания тестовых данных
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
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Only POST allowed'})
        }
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute('INSERT INTO routes (promoter_id, route_date, total_points) VALUES (1, CURRENT_DATE, 6) RETURNING id')
        route = cursor.fetchone()
        route_id = route['id']
        
        test_points = [
            {'address': 'пр. Мира, д. 45, Калининград', 'lat': 54.7104, 'lng': 20.5107},
            {'address': 'ул. Черняховского, д. 12, Калининград', 'lat': 54.7158, 'lng': 20.5128},
            {'address': 'пр. Ленинский, д. 78, Калининград', 'lat': 54.7044, 'lng': 20.5012},
            {'address': 'ул. Горького, д. 23, Калининград', 'lat': 54.7188, 'lng': 20.5201},
            {'address': 'пр. Победы, д. 56, Калининград', 'lat': 54.7025, 'lng': 20.4889},
            {'address': 'ул. Багратиона, д. 34, Калининград', 'lat': 54.7142, 'lng': 20.5323},
        ]
        
        for idx, point in enumerate(test_points):
            completed = idx < 2
            leaflets = 25 if idx == 1 else (30 if idx == 2 else 0)
            
            cursor.execute('''
                INSERT INTO route_points 
                (route_id, address, lat, lng, point_order, completed, leaflets_distributed)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            ''', (
                route_id,
                point['address'],
                point['lat'],
                point['lng'],
                idx + 1,
                completed,
                leaflets
            ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'status': 'success',
                'route_id': route_id,
                'points_created': len(test_points)
            })
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