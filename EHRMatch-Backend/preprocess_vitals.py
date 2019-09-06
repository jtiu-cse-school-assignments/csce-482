from threading import Thread, Lock
from queue import Queue
from multiprocessing import cpu_count
import numpy as np
from scipy import stats
from time import time
import json
import pandas as pd
import psycopg2
import os
from copy import deepcopy

# Global variable to store all the patient info
patientDict = dict()
idCount = 1
patientDictSize = 0
percentDone = 0
printmtx = Lock()

alreadyFound = dict() # dictionary used to filter patient-admissions that have already been found

def connect():
    # @returns:
    #     connection to db

    HOSTNAME = "10.254.16.207"
    DBNAME = "mimic"
    USERNAME = "postgres"
    PASSWORD = "csce482ehrdatabaseaccess"
    
    # -------- Connect to the PostgreSQL database server --------
    conn = psycopg2.connect(host=HOSTNAME,dbname=DBNAME, user=USERNAME, password=PASSWORD)

    return conn

def filter_patients():

    global alreadyFound


    with open('patient_vitals.txt', 'r') as inFile:
        
        for line in inFile:
            # If its not empty
            if line != '\n':
                
                splitList = line.split(':')
                pID_aID = splitList[0].strip()
                alreadyFound[pID_aID] = True

            else:
                print('Found an empty line.')
        
        inFile.close()
    
    return

def generate_keys(dict_mutex, idQueue):
    # @params
    #     dict_mutex: thread lock object to prevent race hazards from happening with the dictionary
    #     idQueue: queue holding all the subjectIDs

    try:
        conn = connect()
        cursor = conn.cursor()
    except:
        return

    while True:
        subID = idQueue.get()

        if subID == None:
            conn.close()
            break

        admissionIDQuery =  '''
                                SELECT hadm_id
                                FROM mimiciii.ADMISSIONS
                                WHERE subject_id = {}
                                '''.format(subID)
        
        cursor.execute(admissionIDQuery)
        admIdList = cursor.fetchall()

        for admId in admIdList:
            # Dictionary key adding critical section
            dict_mutex.acquire()
            key = '{}-{}'.format(subID,admId[0])
            try:
                isFound = alreadyFound[key]
                
                # If the vitals have been already found then release the mutex and move onto the next key
                dict_mutex.release()
                
                continue
            
            except KeyError:
                
                # If the vitals have not been found yet for the key add it for processing
                patientDict[key] = [ None for i in range(8) ]
                dict_mutex.release()
        
        idQueue.task_done()

    conn.close()
    return

def generate_vitals(dict_mutex, file_mutex, keyQueue):
    # @params
    #     dict_mutex: thread lock object to prevent race hazards from happening with the dictionary
    #     keyQueue: queue holding all the keys in patientDict
    global idCount
    global printmtx

    try:
        conn = connect()
        cursor = conn.cursor()
    except:
        return
    

    while True:
        # assign a thread 
        key = keyQueue.get()

        if key == None:
            conn.close()
            break
        else:
            printmtx.acquire()
            idCount+=1
            if (idCount % 1000) == 0:
                print('Percent done: {0:.2f}%'.format((idCount / patientDictSize)*100))
                print('Number of vitals finished: {}'.format(idCount))
            printmtx.release()
            

        splitList = key.split('-')
        pID = splitList[0]
        aID = splitList[1]

        # Start getting all the vitals
        get_heartrate(pID, aID, key, dict_mutex, cursor)
        get_weight(pID, aID, key, dict_mutex, cursor)
        get_bpdiastolic(pID, aID, key, dict_mutex, cursor)
        get_bpsystolic(pID, aID, key, dict_mutex, cursor)
        get_oxysaturation(pID, aID, key, dict_mutex, cursor)
        get_resprate(pID, aID, key, dict_mutex, cursor)
        # get_sa02(pID, aID, key, dict_mutex, cursor)
        # get_sp02(pID, aID, key, dict_mutex, cursor)
        get_temperature(pID, aID, key, dict_mutex, cursor)
        get_outcome(pID, aID, key, dict_mutex, cursor)

        # file_mutex.acquire()
        # with open('patient_vitals.txt','a') as outFile:
        #     outFile.write('{} : {}\n'.format( '{}-{}'.format(pID,aID), patientDict['{}-{}'.format(pID,aID)]   ))
        #     outFile.close()
        # file_mutex.release()

        keyQueue.task_done()

    conn.close()
    return

def get_heartrate(pID, aID, key, dict_mutex, cursor, isThread=True, idx=0):
    # @params:
    #     pID: patient id
    #     aID: admission id for the patient id
    #     key: pID-aID hash created in generate_keys for the patient dictionary
    #     idx: index that the heart rate belongs to
    #     dict_mutex: lock that only allows updating the patient dictionary by one thread at a time
    #     cursor: cursor object used to query the database
    
    global patientDict

    hrQuery =   '''
                    SELECT  ROUND ( CAST (AVG (valuenum) AS NUMERIC), 2 ) AS HEARTRATE
                    FROM    mimiciii.CHARTEVENTS
                    WHERE   subject_id={} AND
                            hadm_id={} AND
                            itemid IN ( 211, 20045 )
                '''.format(pID,aID)

    cursor.execute(hrQuery)
    
    res = cursor.fetchall()

    # Format of res is [ ( Decimal(x), ) ] and we want x. Also add some protection in case of the result from the db being null or none
    hrValue = float(res[0][0]) if res[0][0] != None else None

    # Now that we have the value we want to add it to our dictionary
    if isThread:
        dict_mutex.acquire()
    
    patientDict[key][idx] = hrValue
    
    if isThread:
        dict_mutex.release()

    return

def get_weight(pID, aID, key, dict_mutex, cursor, isThread=True, idx=1):
    # @params:
    #     pID: patient id
    #     aID: admission id for the patient id
    #     key: pID-aID hash created in generate_keys for the patient dictionary
    #     idx: index that the weight belongs to
    #     dict_mutex: lock that only allows updating the patient dictionary by one thread at a time
    #     cursor: cursor object used to query the database
    
    global patientDict

    wtQuery =   '''
                    SELECT ROUND ( CAST( AVG(W) AS NUMERIC), 2 ) AS AVGWEIGHT FROM (   SELECT ROUND ( CAST( AVG(valuenum) AS NUMERIC ), 2 ) * 2.205 AS W
                                                                      FROM mimiciii.CHARTEVENTS
                                                                      WHERE  subject_id = {0} AND
                                                                             hadm_id = {1} AND
                                                                             itemid IN ( 226512, 224639, 763, 581 )
                                                                      UNION
                                                                      SELECT ROUND ( CAST(AVG(valuenum) AS NUMERIC), 2 ) AS W
                                                                      FROM mimiciii.CHARTEVENTS
                                                                      WHERE  subject_id = {0} AND
                                                                             hadm_id = {1} AND
                                                                             itemid IN ( 22653 ) ) AS WEIGHTBL
                '''.format(pID,aID)

    cursor.execute(wtQuery)
    
    res = cursor.fetchall()

    # Format of res is [ ( Decimal(x), ) ] and we want x. Also add some protection in case of the result from the db being null or none
    wtValue = float(res[0][0]) if res[0][0] != None else None

    # Now that we have the value we want to add it to our dictionary
    if isThread:
        dict_mutex.acquire()
    
    patientDict[key][idx] = wtValue
    
    if isThread:
        dict_mutex.release()

    return

def get_resprate(pID, aID, key, dict_mutex, cursor, isThread=True, idx=2):
    # @params:
    #     pID: patient id
    #     aID: admission id for the patient id
    #     key: pID-aID hash created in generate_keys for the patient dictionary
    #     idx: index that the respiratory rate belongs to
    #     dict_mutex: lock that only allows updating the patient dictionary by one thread at a time
    #     cursor: cursor object used to query the database
    
    global patientDict

    rrQuery =   '''
                    SELECT  ROUND ( CAST (AVG (valuenum) AS NUMERIC), 2 ) AS RESPRATE
                    FROM    mimiciii.CHARTEVENTS
                    WHERE   subject_id={} AND
                            hadm_id={} AND
                            itemid IN ( 618, 220210, 3603, 224689, 615, 224690, 619, 614, 224688, 651, 224422 )
                '''.format(pID,aID)

    cursor.execute(rrQuery)
    
    res = cursor.fetchall()

    # Format of res is [ ( Decimal(x), ) ] and we want x. Also add some protection in case of the result from the db being null or none
    rrValue = float(res[0][0]) if res[0][0] != None else None

    # Now that we have the value we want to add it to our dictionary
    if isThread:
        dict_mutex.acquire()
    
    patientDict[key][idx] = rrValue
    
    if isThread:
        dict_mutex.release()

    return

def get_bpsystolic(pID, aID, key, dict_mutex, cursor, isThread=True, idx=3):
    # @params:
    #     pID: patient id
    #     aID: admission id for the patient id
    #     key: pID-aID hash created in generate_keys for the patient dictionary
    #     idx: index that the arterial systolic blood pressure belongs to
    #     dict_mutex: lock that only allows updating the patient dictionary by one thread at a time
    #     cursor: cursor object used to query the database
    
    global patientDict

    bpQuery =   '''
                    SELECT  ROUND ( CAST (AVG (valuenum) AS NUMERIC), 2 ) AS BPSYSTOLIC
                    FROM    mimiciii.CHARTEVENTS
                    WHERE   subject_id={} AND
                            hadm_id={} AND
                            itemid IN ( 220050, 51, 225309, 6701, 220179, 224167, 227243, 455, 3313, 3315, 442, 3317, 3323, 3321 )
                '''.format(pID,aID)

    cursor.execute(bpQuery)
    
    res = cursor.fetchall()

    # Format of res is [ ( Decimal(x), ) ] and we want x. Also add some protection in case of the result from the db being null or none
    bpValue = float(res[0][0]) if res[0][0] != None else None

    # Now that we have the value we want to add it to our dictionary
    if isThread:
        dict_mutex.acquire()
    
    patientDict[key][idx] = bpValue
    
    if isThread:
        dict_mutex.release()

    return

def get_bpdiastolic(pID, aID, key, dict_mutex, cursor, isThread=True, idx=4):
    # @params:
    #     pID: patient id
    #     aID: admission id for the patient id
    #     key: pID-aID hash created in generate_keys for the patient dictionary
    #     idx: index that the arterial diastolic blood pressure belongs to
    #     dict_mutex: lock that only allows updating the patient dictionary by one thread at a time
    #     cursor: cursor object used to query the database
    
    global patientDict

    bpQuery =   '''
                    SELECT  ROUND ( CAST (AVG (valuenum) AS NUMERIC), 2 ) AS BPDIASTOLIC
                    FROM    mimiciii.CHARTEVENTS
                    WHERE   subject_id={} AND
                            hadm_id={} AND
                            itemid IN ( 220051, 8368, 225310, 8555, 220180, 224643, 227242, 8441, 8502, 8440, 8503, 8504, 8507, 8506 )
                '''.format(pID,aID)

    cursor.execute(bpQuery)
    
    res = cursor.fetchall()

    # Format of res is [ ( Decimal(x), ) ] and we want x. Also add some protection in case of the result from the db being null or none
    bpValue = float(res[0][0]) if res[0][0] != None else None

    # Now that we have the value we want to add it to our dictionary
    if isThread:
        dict_mutex.acquire()
    
    patientDict[key][idx] = bpValue
    
    if isThread:
        dict_mutex.release()

    return

def get_temperature(pID, aID, key, dict_mutex, cursor, isThread=True, idx=5):
    # @params:
    #     pID: patient id
    #     aID: admission id for the patient id
    #     key: pID-aID hash created in generate_keys for the patient dictionary
    #     idx: index that the temperature (Farenheit) belongs to
    #     dict_mutex: lock that only allows updating the patient dictionary by one thread at a time
    #     cursor: cursor object used to query the database
    
    global patientDict

    tpQuery =   '''
                    SELECT ROUND ( CAST( AVG(TEMP) AS NUMERIC), 2 ) AS AVGTEMP 
                    FROM (  SELECT  ROUND ( ((  (  CAST (AVG(valuenum) AS NUMERIC)  ) * (9.0/5.0) ) + 32.0), 2) as TEMP
                            FROM    mimiciii.CHARTEVENTS
                            WHERE   subject_id={0} AND 
                                    hadm_id={1} AND
                                    itemid IN (677, 3655, 676, 223762)
                            UNION
                            SELECT  ROUND ( CAST (AVG (valuenum) AS NUMERIC), 2 ) AS TEMP
                            FROM    mimiciii.CHARTEVENTS
                            WHERE   subject_id={0} AND
                                    hadm_id={1} AND
                                    itemid IN ( 678, 223761, 3652, 679, 3654 ) ) AS T
                '''.format(pID,aID)

    cursor.execute(tpQuery)
    
    res = cursor.fetchall()

    # Format of res is [ ( Decimal(x), ) ] and we want x. Also add some protection in case of the result from the db being null or none
    tpValue = float(res[0][0]) if res[0][0] != None else None

    # Now that we have the value we want to add it to our dictionary
    if isThread:
        dict_mutex.acquire()

    patientDict[key][idx] = tpValue

    if isThread:
        dict_mutex.release()

    return

def get_oxysaturation(pID, aID, key, dict_mutex, cursor, isThread=True, idx=6):
    # @params:
    #     pID: patient id
    #     aID: admission id for the patient id
    #     key: pID-aID hash created in generate_keys for the patient dictionary
    #     idx: index that the 02 saturation belongs to
    #     dict_mutex: lock that only allows updating the patient dictionary by one thread at a time
    #     cursor: cursor object used to query the database
    
    global patientDict

    oxQuery =   '''
                    SELECT  ROUND( CAST( AVG(valuenum) AS NUMERIC ), 2 ) AS OXY_SAT
                    FROM    mimiciii.CHARTEVENTS
                    WHERE   subject_id={} AND
                            hadm_id={} AND
                            itemid IN (220227, 220277, 834, 646)
                '''.format(pID,aID)

    cursor.execute(oxQuery)
    
    res = cursor.fetchall()

    # Format of res is [ ( Decimal(x), ) ] and we want x. Also add some protection in case of the result from the db being null or none
    oxValue = float(res[0][0]) if res[0][0] != None else None

    # Now that we have the value we want to add it to our dictionary
    if isThread:
        dict_mutex.acquire()
    
    patientDict[key][idx] = oxValue
    
    if isThread:
        dict_mutex.release()

    return

def get_sp02(pID, aID, key, dict_mutex, cursor, isThread=True, idx=7):
    # @params:
    #     pID: patient id
    #     aID: admission id for the patient id
    #     key: pID-aID hash created in generate_keys for the patient dictionary
    #     idx: index that the Sp02 belongs to
    #     dict_mutex: lock that only allows updating the patient dictionary by one thread at a time
    #     cursor: cursor object used to query the database
    
    global patientDict

    spQuery =   '''
                    SELECT  ROUND( CAST( AVG(valuenum) AS NUMERIC ), 2 ) AS SP_OXY
                    FROM    mimiciii.CHARTEVENTS
                    WHERE   subject_id={} AND
                            hadm_id={} AND
                            itemid IN (646)
                '''.format(pID,aID)

    cursor.execute(spQuery)
    
    res = cursor.fetchall()

    # Format of res is [ ( Decimal(x), ) ] and we want x. Also add some protection in case of the result from the db being null or none
    spValue = float(res[0][0]) if res[0][0] != None else None

    # Now that we have the value we want to add it to our dictionary
    if isThread:
        dict_mutex.acquire()
    patientDict[key][idx] = spValue
    if isThread:
        dict_mutex.release()

    return

def get_sa02(pID, aID, key, dict_mutex, cursor, isThread=True, idx=8):
    # @params:
    #     pID: patient id
    #     aID: admission id for the patient id
    #     key: pID-aID hash created in generate_keys for the patient dictionary
    #     idx: index that the Sa02 belongs to
    #     dict_mutex: lock that only allows updating the patient dictionary by one thread at a time
    #     cursor: cursor object used to query the database
    
    global patientDict

    saQuery =   '''
                    SELECT  ROUND( CAST( AVG(valuenum) AS NUMERIC ), 2 ) AS SA_OXY
                    FROM    mimiciii.CHARTEVENTS
                    WHERE   subject_id={} AND
                            hadm_id={} AND
                            itemid IN (834)
                '''.format(pID,aID)

    cursor.execute(saQuery)
    
    res = cursor.fetchall()

    # Format of res is [ ( Decimal(x), ) ] and we want x. Also add some protection in case of the result from the db being null or none
    saValue = float(res[0][0]) if res[0][0] != None else None

    # Now that we have the value we want to add it to our dictionary
    if isThread:
        dict_mutex.acquire()
    patientDict[key][idx] = saValue
    if isThread:
        dict_mutex.release()

    return

def get_outcome(pID, aID, key, dict_mutex, cursor, isThread=True, idx=7):
    
    global patientDict

    oQuery =    '''
                    SELECT * 
                    FROM   mimiciii.ADMISSIONS 
                    WHERE  CAST ( deathtime as CHAR) IS NOT NULL AND
                    subject_id = {} AND
                    hadm_id = {}
                '''.format(pID,aID)
    
    o1Query =   '''
                    SELECT  hadm_id, 
                            admittime, 
                            dischtime 
                    FROM   mimiciii.ADMISSIONS 
                    WHERE  subject_id={} 
                    ORDER BY admittime ASC
                '''.format(pID)


    cursor.execute(oQuery)
    res = cursor.fetchall()

    # first check if they died
    # if they didnt die then check if the admission was their most recent stay
    # if it isnt their most recent stay then subtract their last stay's discharge date from their current admission date
    #   if it is less than 30 days then they are  


    outVal = 0 if len(res) == 1 else 1

    # so they didn't die well lets check if their admission was the most recent
    if outVal:
        cursor.execute(o1Query)
        res = cursor.fetchall()

        # Want to check if the admission in question is their most recent visit
        isLast = True if res[-1][0] == int(aID) else False
        
        # If the admission is their most recent leave outval as alive
        if isLast:
            pass
        else:
            admIdx = 0
            for aid, atime, dtime in res:
                if aid == int(aID):
                    break
                admIdx += 1
            
            # We get the admission time of the visit after the one in question
            # and subtract it from the discharge time of the admission in question
            dtime, atime = res[admIdx][2], res[admIdx+1][1]
            # print("{} - {} = {}".format(atime,dtime, atime-dtime))
            # print("Days between admissions: {}".format((atime-dtime).days))

            # Want the outcome to be readmitted = 2 if the time between admissions is 30 days or less
            if (atime-dtime).days <= 30:
                outVal = 2
    
    if isThread:
        dict_mutex.acquire()

    patientDict[key][idx] = outVal

    # 1 means alive 0 means dead and 2 is readmitted
    if isThread:
        dict_mutex.release()


    return

def main():
    # Note: takes around 1020.01634 seconds 16 threads to finish
    # Note: takes around 395.036244 seconds with 100 threads to finish

    # filter_patients()
    
    # CPUNUM = cpu_count()
    CPUNUM = 100
    conn = connect()
    cursor = conn.cursor()

    # Get all the unique patient ID's in the db
    patientIDQuery =    '''
                        SELECT DISTINCT subject_id 
                        FROM mimiciii.ADMISSIONS
                        '''
    cursor.execute(patientIDQuery)
    idQueue = Queue()

    # Need to add all the subject ids to the queue so the threads will be able to access them
    for subID in cursor.fetchall():
        idQueue.put(subID[0])
    
    
    QUEUESIZE = idQueue.qsize()

    # Instantiate lock objects
    dict_mutex = Lock()
    file_mutex = Lock()

    threadList = [ None for i in range( CPUNUM ) ]

    # Start the timer for generating all the keys for the patient dictionary
    start = time()

    # Threads will pull subject ids from the idQueue, find all their admission ids, and add them to the patient dictionary
    for i in range(len(threadList)):
        threadList[i] = Thread( target=generate_keys, args=(dict_mutex, idQueue,) )
        threadList[i].start()

    idQueue.join()

    # Stop the threads
    for i in range(QUEUESIZE):
        idQueue.put(None)
    for thread in threadList:
        thread.join()

    # Stop the timer and close the connection. Finished generating all the keys of the patient dictionary 
    end = time()
    conn.close()

    
    global patientDict
    global patientDictSize

    # Want to write out the patient keys (subID-admID) to a file 
    # with open('patient_ids.txt','w') as outFile:
    #     outFile.write(json.dumps(patientDict))
    #     outFile.close()

    patientDictSize = len(patientDict)
    print('Total entries: {}'.format(patientDictSize))
    print('Total runtime of the patientID-admissionID key generation (sec): {}'.format(end-start))

    print('Starting to find vitals now')
    
    # Add all the patient keys into a queue
    keyQueue = Queue()
    for k in patientDict.keys():
        keyQueue.put(k)
    QUEUESIZE = keyQueue.qsize()

    # Want to measure the time it takes to find vital averages for all 9 patients
    start = time()

    # Reuse the threads to find the vitals for a specific admission of a patient
    for i in range(CPUNUM):
        threadList[i] = Thread( target=generate_vitals, args=(dict_mutex, file_mutex, keyQueue,) )
        threadList[i].start()

    # Stop the threads
    keyQueue.join()
    for i in range(QUEUESIZE):
        keyQueue.put(None)
    for thread in threadList:
        thread.join()
    
    # Finished finding all the vitals now so stop the timer and dump patient dict into a json file
    end = time()
    print('Total runtime for finding vitals for all patients (sec): {}'.format(end-start))

    columnList = ['SId','AId','Heart Rate', 'Weight', 'Respiratory Rate', 'BP Systolic', 'BP Diastolic', 'Temperature', 'Oxygen Saturation','Outcome']
    
    with open("patient_vitals.csv", "w") as outFile:

        # first write out the column names
        outFile.write(','.join(columnList))
        outFile.write('\n')
        # finally write out the subject id, adm id, and all the vitals
        for p in patientDict:
            splitList = p.split('-')
            sID = splitList[0]
            aID = splitList[1]

            # need to add both the sId and the aId to the patients vital list
            vitalList = deepcopy(patientDict[p])
            # first add the admission id and then the subject id to match the column list
            vitalList.insert(0,aID)
            vitalList.insert(0,sID)

            # we have to convert the vitallist to a list of strings to be able to use join
            outFile.write(','.join(list(map(str,vitalList))))
            outFile.write('\n')
        outFile.close()


    # Read the csv into a dataframe
    df = pd.read_csv('patient_vitals.csv')
    df = df.replace('None',pd.np.nan)

    # Convert the column types all to floats
    for column in df:
        df[column] = pd.to_numeric(df[column])

    # Fill in all missing values with their column's mean
    # df = df.fillna(df.mean())

    df = df.round(2)

    os.remove('patient_vitals.csv')
    df.to_csv('patient_vitals.csv',index=False)

    # csvtojson()

    return

def csvtojson():
    # @purpose: want the json file to have no 'None' values but rather make use of mean imputation to fill them in
    #           this function uses the csv created by the dataframe to create a json of all the patient vitals

    global patientDict
    with open('patient_vitals.csv') as inFile:

        # read in the column names
        inFile.readline()

        for line in inFile:
            vitals = line.split(',')
            
            # the last vital has the newline character so get rid of it
            vitals[-1] = vitals[-1].strip() 

            # extract both the subject id and admission id from the list
            sid = vitals[0]
            aid = vitals[1]
            vitals = vitals[2:]

            # now we reconstruct the key (sid-aid) to update the vitals currently stored in patientdict
            key = '{}-{}'.format(sid,aid)

            # finally we convert all the vitals currently stored as strings to floats
            # not sure if this matters but why not
            patientDict[key] = list( map(float, vitals) )
        
        inFile.close()
    
    # dump the dictionary as a json
    with open('patient_vitals.json', 'w') as outFile:
        outFile.write(json.dumps(patientDict))
        outFile.close()
    
            



    return

def vital_queries_test():
    # Generates a dictionary of patient vitals for hardcoded patient
    # @params:
    #       None

    global patientDict

    key = '23-152223'
    pID=23
    aID=152223
    patientDict[key] = [None for i in range(10)]
    conn = connect()
    cursor = conn.cursor()

    # get_heartrate(pID,aID,key,None,cursor,isThread=False)
    # get_bpdiastolic(pID,aID,key,None,cursor,isThread=False)
    # get_bpsystolic(pID,aID,key,None,cursor,isThread=False)
    get_oxysaturation(pID,aID,key,None,cursor,isThread=False)
    # get_resprate(pID,aID,key,None,cursor,isThread=False)
    # get_sa02(pID,aID,key,None,cursor,isThread=False)
    # get_sp02(pID,aID,key,None,cursor,isThread=False)
    # get_temperature(pID,aID,key,None,cursor,isThread=False)
    # get_weight(pID,aID,key,None,cursor,isThread=False)
    # get_outcome(pID,aID,key,None,cursor,isThread=False)

    # vitals = ['HR','WT','RR','BPSYS','BPDIS','TEMP','02','SP','SA','OC']
    # d = dict(zip(vitals,patientDict[key]))
    # print(json.dumps(d, indent=2))

    print(patientDict[key])


if __name__ == '__main__':
    
    main()
    
    # Begin test function
    # start = time()
    # vital_queries_test()
    # end = time()
    # print('Total time taken for 1 patient: {} seconds'.format(end-start))
