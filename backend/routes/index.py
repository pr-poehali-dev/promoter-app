'''
Business: API для управления маршрутами промоутеров
Args: event с httpMethod, queryStringParameters, body
Returns: JSON с данными маршрутов или результатом операции
'''

import json
import os
from typing import Dict, Any
from datetime import datetime, date
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
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            promoter_id = params.get('promoter_id', '1')
            route_date = params.get('date', str(date.today()))
            
            cursor.execute('''
                SELECT r.*, 
                       p.name as promoter_name,
                       COUNT(rp.id) as total_points,
                       SUM(CASE WHEN rp.completed THEN 1 ELSE 0 END) as completed_points,
                       SUM(rp.leaflets_distributed) as total_leaflets
                FROM routes r
                LEFT JOIN promoters p ON r.promoter_id = p.id
                LEFT JOIN route_points rp ON r.id = rp.route_id
                WHERE r.promoter_id = %s AND r.route_date = %s
                GROUP BY r.id, p.name
                LIMIT 1
            ''', (promoter_id, route_date))
            
            route = cursor.fetchone()
            
            if route:
                cursor.execute('''
                    SELECT * FROM route_points
                    WHERE route_id = %s
                    ORDER BY point_order
                ''', (route['id'],))
                
                points = cursor.fetchall()
                
                result = dict(route)
                result['points'] = [dict(p) for p in points]
                result['route_date'] = str(result['route_date'])
                result['created_at'] = str(result['created_at'])
                
                for point in result['points']:
                    point['lat'] = float(point['lat']) if point['lat'] else None
                    point['lng'] = float(point['lng']) if point['lng'] else None
                    point['created_at'] = str(point['created_at'])
                    point['completed_at'] = str(point['completed_at']) if point['completed_at'] else None
            else:
                result = None
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(result, ensure_ascii=False)
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'create_route':
                promoter_id = body_data.get('promoter_id', 1)
                route_date = body_data.get('route_date', str(date.today()))
                points_data = body_data.get('points', [])
                
                cursor.execute('''
                    INSERT INTO routes (promoter_id, route_date, total_points)
                    VALUES (%s, %s, %s)
                    RETURNING id
                ''', (promoter_id, route_date, len(points_data)))
                
                route_id = cursor.fetchone()['id']
                
                for idx, point in enumerate(points_data):
                    cursor.execute('''
                        INSERT INTO route_points 
                        (route_id, address, lat, lng, point_order)
                        VALUES (%s, %s, %s, %s, %s)
                    ''', (
                        route_id,
                        point['address'],
                        point.get('lat'),
                        point.get('lng'),
                        idx + 1
                    ))
                
                conn.commit()
                
                result = {'route_id': route_id, 'status': 'created'}
            
            elif action == 'complete_point':
                point_id = body_data.get('point_id')
                leaflets = body_data.get('leaflets', 0)
                photo_url = body_data.get('photo_url')
                
                cursor.execute('''
                    UPDATE route_points
                    SET completed = TRUE,
                        leaflets_distributed = %s,
                        photo_url = %s,
                        completed_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    RETURNING route_id
                ''', (leaflets, photo_url, point_id))
                
                route_data = cursor.fetchone()
                
                if route_data:
                    route_id = route_data['route_id']
                    
                    cursor.execute('''
                        UPDATE routes
                        SET completed_points = (
                            SELECT COUNT(*) FROM route_points 
                            WHERE route_id = %s AND completed = TRUE
                        ),
                        total_leaflets = (
                            SELECT COALESCE(SUM(leaflets_distributed), 0) 
                            FROM route_points WHERE route_id = %s
                        )
                        WHERE id = %s
                    ''', (route_id, route_id, route_id))
                
                conn.commit()
                
                result = {'status': 'completed', 'point_id': point_id}
            
            else:
                result = {'error': 'Unknown action'}
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(result, ensure_ascii=False)
            }
        
        else:
            return {
                'statusCode': 405,
                'headers': headers,
                'body': json.dumps({'error': 'Method not allowed'})
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
