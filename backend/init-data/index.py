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
            {'address': 'ул. Ленина, д. 45', 'lat': 55.7558, 'lng': 37.6173},
            {'address': 'пр. Мира, д. 12', 'lat': 55.7598, 'lng': 37.6273},
            {'address': 'ул. Советская, д. 78', 'lat': 55.7518, 'lng': 37.6373},
            {'address': 'ул. Кирова, д. 23', 'lat': 55.7578, 'lng': 37.6073},
            {'address': 'пр. Победы, д. 56', 'lat': 55.7538, 'lng': 37.6473},
            {'address': 'ул. Гагарина, д. 34', 'lat': 55.7618, 'lng': 37.6173},
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
