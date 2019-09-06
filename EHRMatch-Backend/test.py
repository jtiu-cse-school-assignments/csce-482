# -----------------------------------------
# Unit testing suite for EHR Match back-end
# To run: > python test.py
# -----------------------------------------

import unittest
import random as rand
import pandas as pd
import json
import psycopg2
from threading import Thread, Lock
from app import app, connect

def execute_stmt(cursor, query, lock):
    lock.acquire()
    cursor.execute(query)
    lock.release()

class FlaskTestCase(unittest.TestCase):

    def random_pair_gen(self):
        '''
            - @purpose: returns a list of random patient id and admission id pairs
        '''

        df = pd.read_csv('patient_vitals.csv')
        df.set_index(['SId', 'AId'],inplace=True)
        tmp = list(df.index.values)
        pairList = [ tmp[rand.randint(0, len(tmp)-1)] for i in range(5) ]
        return pairList

    def test_search_bar_route(self):
        '''
            - @purpose: tests the return status code of the search bar route
        '''

        pairList = self.random_pair_gen()

        tester = app.test_client(self)

        for sid, _ in pairList:
            url = "http://localhost:5000/search/{}".format(sid)
            response = tester.get(url)
            self.assertEqual(response.status_code, 200, 'Search bar status code was {}'.format(response.status_code))
    
    def test_search_bar_response(self):
        '''
            - @purpose: tests the return type of the search bar route
        '''

        pairList = self.random_pair_gen()

        tester = app.test_client(self)

        for sid, _ in pairList:
            url = "http://localhost:5000/search/{}".format(sid)
            response = tester.get(url)
            self.assertEqual(type(response.json), type(list()), 'Search bar response was not a list of JSON')
    
    def test_cluster_route(self):

        pairList = self.random_pair_gen()
        tester = app.test_client(self)

        for sid,aid in pairList:
            url = "http://localhost:5000/cluster/{}/{}".format(sid,aid)
            response = tester.get(url)
            self.assertEqual(response.status_code, 200, 'Recieved status code {} from cluster route'.format(response.status_code))

    def test_cluster_response(self):

        pairList = self.random_pair_gen()
        tester = app.test_client(self)

        for sid, aid in pairList:

            url = "http://localhost:5000/cluster/{}/{}".format(sid,aid)
            response = tester.get(url)
            self.assertEqual(type(response.json),type(dict()), 'Cluster response was not a JSON')

    def test_patient_profile_route(self):

        pairList = self.random_pair_gen()
        tester = app.test_client(self)

        for sid, aid in pairList:
            url = "http://localhost:5000/profile_patient/{}".format(sid)
            response = tester.get(url)
            self.assertEqual(response.status_code,200,'Received status code {} from patient profile'.format(response.status_code))

    def test_patient_profile_response(self):
        
        pairList = self.random_pair_gen()
        tester = app.test_client(self)

        for sid, aid in pairList:
            url = "http://localhost:5000/profile_patient/{}".format(sid)
            response = tester.get(url)
            self.assertEqual(type(response.json), type(dict()) ,'Patient profile response was not JSON')

    def test_database_durability(self):

        conn = connect()
        cursor = conn.cursor()
        queryList = [ "SELECT * FROM mimiciii.ADMISSIONS WHERE subject_id = {}".format(rand.randint(10,10000)) for i in range(10) ]
        lock = Lock()
        threadList = [ None for i in range(10) ]

        for i in range(len(threadList)):
            threadList[i] = Thread(target=execute_stmt, args=(cursor, queryList[rand.randint(0,9)],lock))
            threadList[i].start()
        
        for thread in threadList:
            thread.join()

        # If it makes it this far then all tests passed
        self.assertTrue(True)

    def test_database_connection(self):
        conn = connect()
        self.assertNotEqual(type(conn), None, 'Connection to database failed')

    def test_patient_ranking_route(self):

        pairList = self.random_pair_gen()
        tester = app.test_client(self)

        for sid, aid in pairList:
            url = 'localhost:5000/rank/{}/{}'.format(sid,aid)
            response = tester.get(url)
            self.assertEqual(response.status_code, 200, 'Received status code {} from rank route'.format(response.status_code))

    def test_patient_ranking_response(self):

        pairList = self.random_pair_gen()
        tester = app.test_client(self)

        url = 'localhost:5000/rank/{}/{}'.format(pairList[0][0], pairList[0][1])
        trueResponse = tester.get(url)

        for i in range(5):
            response = tester.get(url)
            self.assertEqual(response.json, trueResponse.json, 'Response was not valid')


if __name__ == "__main__":
    unittest.main()