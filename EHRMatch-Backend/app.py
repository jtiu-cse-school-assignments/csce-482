from flask import Flask, jsonify, session, url_for
from flask_cors import CORS, cross_origin
from sklearn.cluster import KMeans
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import normalize, scale
from sklearn.decomposition import PCA
from copy import deepcopy
from scipy.spatial.distance import euclidean
from scipy import stats
from sqlalchemy import create_engine
from numpy.linalg import norm
import psycopg2
import psycopg2.extras
import pandas as pd
import pprint
import json
import matplotlib.pyplot as plt
import numpy as np
from math import isnan
from math import floor
from time import time
from threading import Thread, Lock
from kneed import KneeLocator

# Initialize the app
app = Flask(__name__)
CORS(app, support_credentials=True)

# Connection to the database
conn = None

# Main dataframe used to store ALL subject_ids-admission_ids
df = None

# Dataframe used to store all the clustered patients and labels
dfCluster = None

# Connection to an IMDB
engine = None

# clustering lock
clusterMutex = Lock()

def connect():
    # @returns: connection to db

    HOSTNAME = "10.254.16.207"
    DBNAME = "mimic"
    USERNAME = "postgres"
    PASSWORD = "csce482ehrdatabaseaccess"

    # -------- Connect to the PostgreSQL database server --------
    conn = psycopg2.connect(host=HOSTNAME,dbname=DBNAME, user=USERNAME, password=PASSWORD)

    return conn

def extract_vitals(dfMutex, subList, dfMain):
    # @params: dfMutex-{threading.Lock} lock object used when concatenating df to dfCluster
    # @params: subList-{list} list of dictionaries containing a subject_id and hadm_id of a patient
    # @params: dfMain-{pd.DataFrame} dataframe that stores all the patient information

    global dfCluster

    columnList = ['SId','AId','Heart Rate', 'Weight', 'Respiratory Rate', 'BP Systolic', 'BP Diastolic', 'Temperature', 'Oxygen Saturation','Outcome']
    dfWorking = pd.DataFrame(columns=columnList)

    MAXINDEX = 0

    # Iterate through the dictionaries in the sublist passed from cluster
    for d in subList:
        # Extract both the subject id and admission id
        sId = int( d['subject_id'] )
        aId = int( d['hadm_id'] )

        # Extract all the vitals from the df and convert them to a list
        vList = list(dfMain.loc[ (sId,aId) ].values)
        vList.insert(0,aId)
        vList.insert(0,sId)

        # Add the list to the working df that will be unioned with the clustering df
        dfWorking.loc[ MAXINDEX ] = vList

        MAXINDEX += 1

    dfMutex.acquire()
    dfCluster = pd.concat([dfCluster,dfWorking], ignore_index=True)
    dfMutex.release()

    return

@app.route("/")
def index():
    # @purpose: used to make sure the app is running.
    return 'Hello world'

@app.route("/search/<int:subject_id>")
@cross_origin(supports_credentials=True)
def search(subject_id):
    # @params: subject_id-{int} Patient X id given by the user in the search bar
    # @returns: json of admission ids, admission type, and the diagnosis for the admission of Patient X

    stmt =  '''
                SELECT  hadm_id,
                        admission_type,
                        diagnosis
                FROM mimiciii.admissions
                WHERE subject_id={}
            '''.format(subject_id)
    conn = connect()
    cursor = conn.cursor()
    cursor.execute(stmt)

    columns = ('hadm_id', 'admission_type','diagnosis')
    res = [ dict(zip(columns,row)) for row in cursor.fetchall() ]

    return jsonify(res)

@app.route("/cluster/<int:subject_id>/<int:hadm_id>")
@cross_origin(supports_credentials=True)
def cluster(subject_id,hadm_id):
    # @params: subject_id-{integer} "Patient X id"
    # @params: hadm_id-{integer} "Patient X admission id selected by the user"
    # @returns: cluster dictionary of all the patients that fell under the same ICD as X

    global clusterMutex

    clusterMutex.acquire()

    global df
    global conn
    global dfCluster
    global engine
    columnList = ['SId','AId','Heart Rate', 'Weight', 'Respiratory Rate', 'BP Systolic', 'BP Diastolic', 'Temperature', 'Oxygen Saturation','Outcome']
    # Set what vitals we want to remove outliers for
    vitalList = ['Heart Rate', 'Weight', 'Respiratory Rate', 'BP Systolic', 'BP Diastolic', 'Temperature', 'Oxygen Saturation']

    # Get all the patients that fell under the same icd9 code as Patient X.
    stmt1 =  '''
                SELECT icd9_code
                FROM mimiciii.DIAGNOSES_ICD
                WHERE subject_id={} AND hadm_id={} AND seq_num IN (1,2,3,4)
            '''.format(subject_id,hadm_id)
    stmt2 =  '''
                SELECT DISTINCT subject_id, hadm_id
                FROM mimiciii.DIAGNOSES_ICD
                WHERE icd9_code IN (
                    {}
                ) AND seq_num IN (1,2,3,4)
            '''.format(stmt1)

    cursor = conn.cursor()
    cursor.execute(stmt2)

    columns = ('subject_id', 'hadm_id',)
    res = [ dict(zip(columns,row)) for row in cursor.fetchall() ]
    print('Number of patients: {}'.format(len(res)))
    # So now we have all the subject_id's that fell under the same ICD code. Now we extract those patient vitals.

    dfCluster = pd.DataFrame(columns=columnList)

    # Split all the returned ids into sublists

    vsubLists = [res[x:x+10000] for x in range(0, len(res), 10000)]

    # Create as many threads as there are sublists
    threadList = [None for i in range(len(vsubLists))]
    print("Number of threads: {}".format(len(threadList)))

    # Need a lock for the dfCluster
    dfMutex = Lock()
    start = time()

    # Now we will iterate through all the threads, create them, and send them off with a sublist
    for i in range(len(vsubLists)):
        threadList[i] = Thread(target=extract_vitals, args=(dfMutex,vsubLists[i],deepcopy(df)))
        threadList[i].start()

    for thread in threadList:
        thread.join()

    end = time()

    print("Took: {0:.2f} seconds to concat all patient vitals".format(end-start))

    # now we need to fill in all the nans with the mean of the cluster df
    dfCluster = dfCluster.replace('None',pd.np.nan)
    for column in dfCluster:
        dfCluster[column] = pd.to_numeric(dfCluster[column])

    # now we fill in with the median
    dfCluster = dfCluster.fillna(dfCluster.median())
    dfCluster = dfCluster.round(2)
    dfFiller = dfCluster[vitalList].median().round(2)

    # Possible to have all nan slices so we need to take care of that by filling it in with the median of the whole pop
    nanList = []
    for col, _ in dfCluster.iteritems():
        if np.isnan(dfCluster[col].values).all():
            nanList.append(col)
            dfCluster[col].fillna(df[col].median().round(2), inplace=True)

    # after filling the all nan slice with the median we need to not look for outliers in it cause everything is the median.
    vitalList = [ elem for elem in vitalList if elem not in nanList ]

    # Gotta get rid of anything that is 3 standard deviations from the mean
    z = np.abs( stats.zscore(dfCluster[vitalList]) )
    rows, columns = np.where(z > 3)

    print("Number of outliers: {}".format(len(rows)))
    for r, c in list(zip(rows,columns)):
        # take all the values that were 3 standard deviations away, fill it with whatever we're using to fill nans with (mean,median,etc.)
        dfCluster.loc[r].replace(
            dfCluster[vitalList].loc[r,vitalList[c]], # Find the outlier and replace it with the median of the column
            dfFiller.loc[vitalList[c]],
            inplace=True)

    # From here we now have all the vitals associated with each subject_id. Now do the clustering.
    start_KMeans()

    # Output the dataframe to a csv file to be used in plot.py
    # dfCluster.to_csv('cluster.csv',index=False)

    # Get the cluster label of patient X
    dfCluster.set_index(['SId','AId'], inplace=True)
    dfCluster.sort_index(inplace=True)
    patientSeries = dfCluster.loc[ (int(subject_id), int(hadm_id)) ]
    clusterLabel = patientSeries['Cluster Label']

    # Output all of the patients in the same cluster as X to an IMDB table DFSAMECLUSTER
    dfCluster.loc[ dfCluster['Cluster Label'] == clusterLabel ].to_sql('DFSAMECLUSTER',con=engine, if_exists='replace')

    dfCluster.to_sql('DFCLUSTER', con=engine, if_exists='replace')

    # Set the index back to the normal 0,1,2,3...
    dfCluster.reset_index(inplace=True)

    clusterDict = dfCluster.to_dict()
    clusterMutex.release()

    return jsonify(clusterDict)

@app.route("/rank/<int:subject_id>/<int:hadm_id>")
@cross_origin(supports_credentials=True)
def rank(subject_id, hadm_id):
    # @params: subject_id-{int} subject id of patient
    # @params: hadm_id-{int} admission id of patient
    # @returns: -{ list["subject_id-admission_id"] } top 10 closest patients to X in the same cluster.

    global engine

    dfSameCluster = pd.read_sql_table("DFSAMECLUSTER",engine)


    dfSameCluster.set_index(['SId', 'AId'], inplace=True)
    dfSameCluster.sort_index(inplace=True)

    sid_aid = (int(subject_id), int(hadm_id))

    if sid_aid not in dfSameCluster.index:
        return "Please visit: </h3><strong>{}</strong>".format(url_for('cluster', subject_id=subject_id, hadm_id=hadm_id))

    dfSameCluster['Distance'] = 999999999.0

    # List of vitals for patient x
    xList = list(map(float, list(dfSameCluster.loc[(sid_aid)].values)))
    xList = xList[:len(xList)-2]

    for idx_tup in dfSameCluster.index.values:

        if idx_tup == sid_aid:
            # The distance between patient x and himself make large
            continue
        else:
            # List of vitals for the current patient in the same cluster as X
            yList = list( map(float, list(dfSameCluster.loc[(idx_tup)].values)) )
            yList = yList[:len(yList)-2]

            # Distance between x and the current patient
            distance = euclidean(xList, yList)
            # print('Distance from sid_aid: {}'.format(distance))
            dfSameCluster.loc[(idx_tup), 'Distance'] = distance
            # print('In the dataframe: {}'.format(dfSameCluster.loc[(idx_tup), 'Distance']))

    dfSameCluster.sort_values(by='Distance', ascending=True, inplace=True)

    # List of the closest patients to X in the same cluster
    closestList = list(dfSameCluster.head(10).index.values)
    tmp = []
    for sid, aid in closestList:

        # want to skip patient x or another other admissions of x
        if (sid_aid == (sid,aid)) or (sid == sid_aid[0]) :
            continue

        pair = '{}-{}'.format(sid,aid)
        tmp.append(pair)

    return jsonify({'PList': tmp})

@app.route('/vitals/<int:subject_id>/<int:hadm_id>')
@cross_origin(supports_credentials=True)
def vitals(subject_id, hadm_id):
    # @params: subject_id-{int} subject id
    # @params: subject_id-{int} admission id
    # @returns: patient vitals of a specific patient and admission

    global engine

    dfVitals = pd.read_sql_table('DFCLUSTER',engine)
    idx_tup = (int(subject_id),int(hadm_id))
    dfVitals.set_index(['SId','AId'], inplace=True)
    dfVitals.sort_index(inplace=True)

    return jsonify(dfVitals.loc[idx_tup].to_dict())

@app.route('/summary_table')
@cross_origin(support_credentails=True)
def summary_table():

    global engine

    df = pd.read_sql_table('DFCLUSTER',engine)

    labelList = np.sort(df['Cluster Label'].unique())
    summaryDict = { str(l) : {} for l in labelList }
    vitalList = [ c for c in df.columns.values if c not in ['SId','AId','Outcome','Cluster Label'] ]

    for l in labelList:
        k = str(l)
        summaryDict[k]['Mean'] = df[vitalList].loc[ df['Cluster Label'] == l ].mean().round(2).fillna(str("")).astype(str).to_dict()
        summaryDict[k]['Standard Deviation'] = df[vitalList].loc[ df['Cluster Label'] == l ].std().round(2).fillna(str("")).astype(str).to_dict()
        summaryDict[k]['Median'] = df[vitalList].loc[ df['Cluster Label'] == l ].median().round(2).fillna(str("")).astype(str).to_dict()
        summaryDict[k]['Q1'] = df[vitalList].loc[ df['Cluster Label'] == l ].quantile(.25).round(2).fillna(str("")).astype(str).to_dict()
        summaryDict[k]['Q3'] = df[vitalList].loc[ df['Cluster Label'] == l ].quantile(.75).round(2).fillna(str("")).astype(str).to_dict()
        summaryDict[k]['IQR'] = (df[vitalList].loc[ df['Cluster Label'] == l ].quantile(.75) - df[vitalList].loc[ df['Cluster Label'] == l ].quantile(.25)).round(2).fillna(str("")).astype(str).to_dict()

    return jsonify(summaryDict)

@app.route('/profile_patient/<int:subject_id>')
@cross_origin(support_credentials=True)
def patient_profile(subject_id):
	# @params: subject_id-{int} subject id
	# @returns: Profile for the provided patient as a json object

	patient_admissions_query = '''
			SELECT hadm_id
			FROM mimiciii.admissions
			WHERE subject_id={}
		'''.format(subject_id)

	patient_data_query = '''
		SELECT gender, expire_flag
		FROM mimiciii.patients
		WHERE subject_id={}
	'''.format(subject_id)

	conn = connect()
	cursor = conn.cursor()
	cursor.execute(patient_admissions_query)

	admission_list = cursor.fetchall()

	cursor.execute(patient_data_query)
	patient_data = cursor.fetchall()

	out = dict()

	if len(patient_data) != 0:
		out['gender'] = patient_data[0][0]
		out['expire_flag'] = patient_data[0][1]
		out['num_admissions'] = len(admission_list)
		out['admissions'] = []

		for admission in admission_list:
			admin_data = patient_admissions(subject_id, admission[0], cursor)
			out['ethnicity'] = admin_data['ethnicity']
			del admin_data['ethnicity']
			out['admissions'].append(admin_data)

	return jsonify(out)

def patient_admissions(subject_id, hadm_id, cursor):
	admission_query = '''
		SELECT
				ethnicity,
				EXTRACT(epoch FROM admittime - dob) / 31557600.0 AS age,
				EXTRACT(epoch FROM dischtime - admittime) / 86400.0 AS staylength,
				CASE
					WHEN CAST (mimiciii.admissions.deathtime AS CHAR) IS NOT NULL THEN true
					ELSE false
				END,
				admission_type,
				diagnosis,
				admittime,
				dischtime
		FROM mimiciii.admissions, mimiciii.patients
		WHERE
			mimiciii.patients.subject_id={0} AND
			mimiciii.admissions.subject_id={0} AND
			mimiciii.admissions.hadm_id={1}
	'''.format(subject_id, hadm_id)

	icu_query = '''
		SELECT COUNT(icustay_id)
		FROM mimiciii.icustays
		WHERE
			subject_id={0} AND
			hadm_id={1}
	'''.format(subject_id, hadm_id)

	note_query = '''
		SELECT text
		FROM mimiciii.noteevents
		WHERE
			category LIKE 'Discharge summary' AND
			subject_id={} AND
			hadm_id={}
	'''.format(subject_id, hadm_id)

	cursor.execute(admission_query)
	columns = ('ethnicity', 'age', 'staylength', 'expired', 'admission_type', 'diagnosis', 'admittime', 'dishtime')
	out = dict(zip(columns,cursor.fetchall()[0]))

	cursor.execute(icu_query)
	out['icustay_count'] = cursor.fetchall()[0][0]

	cursor.execute(note_query)
	last_note = cursor.fetchall()
	out['last_note'] = last_note[0][0] if len(last_note) > 0 else None

	out['admin_id'] = hadm_id

	return out

@app.route('/profile_vitals/<int:subject_id>/<int:hadm_id>')
@cross_origin(support_credentials=True)
def profile_vitals(subject_id, hadm_id):
	# @params: subject_id-{int} subject id
	# @returns: Profile for the provided patient as a json object

	#type_trans dictionary
	conn = connect()
	dcrsr = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

	q1 = '''
		SELECT
			label,
			itemid
		FROM
			mimiciii.D_LABITEMS
		WHERE
			itemid IN ( 50882,  50808, 50902,
						50912, 50809, 50931,
						51478, 51221, 51480,
						50813, 50960, 50970,
						50833, 50971,  50983  )
		'''

	dcrsr.execute(q1)
	type_trans = { elem['itemid'] : elem['label'] for elem in dcrsr.fetchall() }

	#chart_trans dictionary
	q2 =    '''
		SELECT
			label,itemid
		FROM mimiciii.D_ITEMS
		WHERE itemid IN (
				677, 3655, 676, 223762,
				678, 223761, 3652, 679,
				3654, 226512, 224639, 763,
				581, 22653, 220051, 8368,
				225310, 8555, 220180, 224643,
				227242, 8441, 8502, 8440,
				8503, 8504, 8507, 8506,
				220050, 51, 225309, 6701,
				220179, 224167, 227243, 455,
				3313, 3315, 442, 3317,
				3323, 3321, 618, 220210,
				3603, 224689, 615, 224690,
				619, 614, 224688, 651,
				224422, 211, 20045, 220227,
				220277, 646, 834
			)
		'''

	dcrsr.execute(q2)
	chart_trans = { elem['itemid'] : elem['label'] for elem in dcrsr.fetchall() }

	lab_events_query = '''
			SELECT
				itemid,
				valuenum,
				valueuom,
				charttime,
				EXTRACT(epoch FROM (charttime - admittime)) / EXTRACT(epoch FROM dischtime - admittime) AS time,
				flag
			FROM mimiciii.labevents, mimiciii.admissions
			WHERE
				mimiciii.labevents.subject_id={0} AND
				mimiciii.labevents.hadm_id={1} AND
				mimiciii.admissions.subject_id={0} AND
				mimiciii.admissions.hadm_id={1} AND
				itemid IN (
					50882, 50808, 50902, 50912,
					50809, 50931, 51478, 51221,
					51480, 50813, 50960, 50970,
					50833, 50971, 50983
				)
		'''.format(subject_id, hadm_id)

	chart_events_query = '''
			SELECT
				itemid,
				valuenum,
				valueuom,
				charttime,
				EXTRACT(epoch FROM (charttime - admittime)) / EXTRACT(epoch FROM dischtime - admittime) AS time
			FROM mimiciii.chartevents, mimiciii.admissions
			WHERE
				mimiciii.chartevents.subject_id={0} AND
				mimiciii.chartevents.hadm_id={1} AND
				mimiciii.admissions.subject_id={0} AND
				mimiciii.admissions.hadm_id={1} AND
				itemid IN (
					677, 3655, 676, 223762,
					678, 223761, 3652, 679,
					3654, 226512, 224639, 763,
					581, 22653, 220051, 8368,
					225310, 8555, 220180, 224643,
					227242, 8441, 8502, 8440,
					8503, 8504, 8507, 8506,
					220050, 51, 225309, 6701,
					220179, 224167, 227243, 455,
					3313, 3315, 442, 3317,
					3323, 3321, 618, 220210,
					3603, 224689, 615, 224690,
					619, 614, 224688, 651,
					224422, 211, 20045, 220227,
					220277, 646, 834
				)
		'''.format(subject_id, hadm_id)

	procedures_query = '''
			SELECT
				seq_num,
				icd9_code
			FROM mimiciii.procedures_icd
			WHERE
				subject_id={} AND
				hadm_id={}
		'''.format(subject_id, hadm_id)

	icd_query = '''
			SELECT
				short_title,
				long_title
			FROM mimiciii.d_icd_procedures
			WHERE
				icd9_code='{}'
		'''

	cursor = conn.cursor()

	out = dict()
	out['charttimes'] = [[] for i in range(0, 100)]
	out['labtimes'] = [[] for i in range(0, 100)]

	#Lab results
	cursor.execute(lab_events_query)
	lab_results = cursor.fetchall()

	for lab_item in lab_results:
		if lab_item[1] == None: continue

		time_index = floor(lab_item[4] * 100.0)
		#This puts 1.0 times in the 99% bucket, because they have nowhere else to go.
		time_index = max(min(time_index, 99), 0)
		item_id = lab_item[0]

		lab_columns = ('type', 'value', 'units', 'date', 'time', 'abnormal')
		add_list = out['labtimes'][time_index]
		add_list.append(dict(zip(lab_columns,lab_item)))
		add_list[len(add_list) - 1]['type'] = type_trans[item_id]

	#Chart events
	cursor.execute(chart_events_query)
	chart_results = cursor.fetchall()

	for chart_item in chart_results:
		#Null values usually have negative times, and are invalid anyway,
		#so just chuck them
		if chart_item[1] == None: continue

		time_index = floor(chart_item[4] * 100.0)
		#1.0 gives 100, which is out of range, so just put in last bucket.
		time_index = max(min(time_index, 99), 0)

		item_id = chart_item[0]

		chart_columns = ('type', 'value', 'units', 'date', 'time')
		add_list = out['charttimes'][time_index]
		add_list.append(dict(zip(chart_columns,chart_item)))
		add_list[len(add_list) - 1]['type'] = chart_trans[item_id]

	#Procedures
	cursor.execute(procedures_query)
	procedure_results = cursor.fetchall()

	procedure_results.sort(key=lambda tup: tup[0])

	out['procedures'] = []

	for procedure in procedure_results:
		proc_icd_query = icd_query.format(procedure[1])
		cursor.execute(proc_icd_query)
		icd_names = cursor.fetchall()

		#Sometimes these are missing. Maybe they're recorded wrong?
		if len(icd_names) == 0: icd_names.append((str(procedure[1]), 'No name found for icd9 code'))

		proc_list = out['procedures']

		proc_list.append(dict())
		proc_list[len(proc_list) - 1]['long'] = icd_names[0][1]
		proc_list[len(proc_list) - 1]['short'] = icd_names[0][0]

	return jsonify(out)

def start_KMeans():

    global dfCluster

    # Before dropping the SId, AId, & Outcome columns from dfCluster so only the vitals are there, we want to make sure to save them elsewhere.
    dfIDs = pd.DataFrame(columns=['SId','AId','Outcome'])
    dfIDs['SId'] = dfCluster['SId'].astype('int64',copy=True)
    dfIDs['AId'] = dfCluster['AId'].astype('int64',copy=True)
    dfIDs['Outcome'] = dfCluster['Outcome'].astype('int64',copy=True)
    dfCluster.drop(['SId','AId','Outcome'],1,inplace=True)

    # Take out all the vitals. This is a list of lists -- each element is a row from the df.
    allvitals = dfCluster.values
    # Now run K-Means for increasing numbers of k and find the knee of the curve
    inertias = []
    kList = [i for i in range(1,20)]
    allVitalsNorm = scale(allvitals)

    models = [ KMeans(n_clusters=k, random_state=1).fit(allVitalsNorm) for k in kList ]
    inertias = [ m.inertia_ for m in models ]

    # Find the knee of the curve. Makes use of the kneed module suggested by Nate.
    kn = KneeLocator(kList,inertias,S=1.0, curve='convex',direction='decreasing')
    print('Recommended number of clusters: {}'.format(kn.knee))

    # Recommended number of clusters is the knee of the curve.
    model = models[kn.knee]

    # Add what cluster each row belongs to
    dfCluster['Cluster Label'] = model.labels_

    for column in dfIDs:
        dfIDs[column] = pd.to_numeric(dfIDs[column])

    # Add both the subject id and admission id to the cluster dataframe
    dfCluster['SId'] = dfIDs['SId'].astype('int64',copy=True)
    dfCluster['AId'] = dfIDs['AId'].astype('int64',copy=True)
    dfCluster['Outcome'] = dfIDs['Outcome'].astype('int64',copy=True)

    return

def start_GMM():


    global dfCluster

    # We only want the vitals to be fed into the clustering algorithm
    dfIDs = pd.DataFrame(columns=['SId','AId'])
    dfIDs['SId'] = dfCluster['SId'].astype('int64',copy=True)
    dfIDs['AId'] = dfCluster['AId'].astype('int64',copy=True)
    dfCluster.drop(['SId','AId'],1,inplace=True)

    # The clustering algorithm takes in a list of lists which in our case will be the vitals
    allVitals = dfCluster.values

    # Now in a similar fashion to k-means we need to find out how many clusters we want
    nList = [ i for i in range(1,15) ]
    allVitalsNorm = scale(allVitals)

    models = [ GaussianMixture(n, covariance_type='full', random_state=0).fit(allVitalsNorm) for n in nList ]

    bicList = [ m.bic(allVitals) for m in models ]
    aicList = [ m.aic(allVitals) for m in models ]

    kn = KneeLocator(nList,bicList,S=1.0, curve='convex',direction='decreasing')
    kn1 = KneeLocator(nList,aicList,S=1.0, curve='convex', direction='decreasing')
    print('Recommended number of clusters by BIC: {}'.format(kn.knee))
    print('Recommended number of clusters by AIC: {}'.format(kn1.knee))

    nComps = kn.knee
    model = models[nComps]

    # may be interested in knowing the probabilities in the future
    # probs = model.predict_proba(allVitals)
    # for p in probs:
    #     if any( (i < 1.00) and (i > 0.00) for i in p ):
    #         print(p.round(3))

    dfCluster['Cluster Label'] = model.predict(allVitalsNorm)

    for column in dfIDs:
        dfIDs[column] = pd.to_numeric(dfIDs[column])

    # Add both the subject id and admission id to the cluster dataframe
    dfCluster['SId'] = dfIDs['SId'].astype('int64',copy=True)
    dfCluster['AId'] = dfIDs['AId'].astype('int64',copy=True)


    return

def prepare_env():

    global df
    global conn
    global engine
    global dfCluster
    columnList = ['SId','AId','Heart Rate', 'Weight', 'Respiratory Rate', 'BP Systolic', 'BP Diastolic', 'Temperature', 'Oxygen Saturation','Outcome']

    # Create a connection to the database
    conn = connect()

    # Read in the preprocessed data generated from preprocess_vitals.py
    df = pd.read_csv('patient_vitals.csv')

    # Create an index on the subject id and admission id
    df.set_index(['SId','AId'],inplace=True)
    df.sort_index(inplace=True)

    # Instantiate the dataframe that will be used for clustering
    dfCluster = pd.DataFrame(columns=columnList)

    # Create an IMDB
    engine = create_engine("sqlite:///ehrmatch",echo=False)

    df.to_sql('DFMAIN',engine,if_exists='replace')

# Prep all the necessary variables/data structures that will be used in the program
prepare_env()


if __name__ == '__main__':
    # Start the app in debug mode
    app.run(debug=True)
