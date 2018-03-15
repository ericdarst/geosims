<?php
//Check $_POST and process request
if ((!empty($_POST["json"])) && (isset($_SERVER['HTTP_UWNETID']))) {
	require_once '../../common/php/common.php';
	$userNetid = $_SERVER['HTTP_UWNETID'];
	$astraAuthz = getAstraInfo($userNetid, false); //Get ASTRA authorizations for netid
	if (hasAuthz($astraAuthz)) { //If user is authorized
		require_once '../../common/php/login.php';
		require_once 'getErrors_sql.php';
  	//Define return array
  	$arr = array(
  		'request' => array(),
  		'results' => array() );

  	//Populate request array
  	$arr['request'] = json_decode($_POST["json"], true);

  	$getErrors = $arr['request'];
  	//Connection session variable
  	$conn = createConn($db_username,$db_password,$db_server,$db_database);  //Connection property variables defined in login.php
		if (in_array('blgErrorsByTableByType',$getErrors,true)) {
			$queryStr = '';
			foreach (array('facErrors','roomErrors') as $queryType) {
				if (strlen($queryStr) > 0) $queryStr .= ' union ';
				$queryStr .= 'select TBL, SEVERITY, ERROR_TYPE, COUNT(*) as COUNT from ( ';
				$queryStr .= $getErrors_sql[$queryType];
				$queryStr .= ') x group by TBL, SEVERITY, ERROR_TYPE ';
			}
			$queryStr .= ' order by SEVERITY';
  		$stid = odbc_prepare($conn, $queryStr);
      odbc_execute($stid,array());
      $arr['results']['blgErrorsByTableByType'] = processQuery($stid); //Populate return array with query results
      odbc_free_result($stid);
    }
    if (in_array('blgErrorsByFac',$getErrors,true)) {
			$queryStr = 'select q.facility_code, SUM(q.COUNT) as COUNT from (';
			$i = 0;
			foreach (array('facErrors','roomErrors') as $queryType) {
				if ($i > 0) $queryStr .= ' union ';
				$queryStr .= 'select FACILITY_CODE, COUNT(*) as COUNT from ( ';
				$queryStr .= $getErrors_sql[$queryType];
				$queryStr .= ') x group by FACILITY_CODE';
				$i += 1;
			}
			$queryStr .= ') q group by q.facility_code order by 2 desc';
  		$stid = odbc_prepare($conn, $queryStr);
      odbc_execute($stid,array());
      $arr['results']['blgErrorsByFac'] = processQuery($stid); //Populate return array with query results
      odbc_free_result($stid);
    }
    if (in_array('blgChangesByTable',$getErrors,true)) {
    	$queryStr = $getErrors_sql['blgChangesByTable'];
  		$stid = odbc_prepare($conn, $queryStr);
      odbc_execute($stid,array());
      $arr['results']['blgChangesByTable'] = processQuery($stid); //Populate return array with query results
      odbc_free_result($stid);
    }
  	if (in_array('facErrors',$getErrors,true)) {
			$queryStr = $getErrors_sql['facErrors'];
  		$stid = odbc_prepare($conn, $queryStr);
      odbc_execute($stid,array());
      $arr['results']['facErrors'] = processQuery($stid); //Populate return array with query results
      odbc_free_result($stid);
    }
    if (in_array('facStatus',$getErrors,true)) {
			$queryStr = $getErrors_sql['facStatus'];
  		$stid = odbc_prepare($conn, $queryStr);
      odbc_execute($stid,array());
      $arr['results']['facStatus'] = processQuery($stid); //Populate return array with query results
      odbc_free_result($stid);
    }
    if (in_array('roomErrors',$getErrors,true)) {
    	$queryStr = $getErrors_sql['roomErrors'];
    	$queryStr .= ' order by SEVERITY, TBL, ERROR_TYPE, FACILITY_CODE, ROOM_NUMBER';
    	$stid = odbc_prepare($conn, $queryStr);
      odbc_execute($stid,array());
      $arr['results']['roomErrors'] = processQuery($stid); //Populate return array with query results
      odbc_free_result($stid);
    }
    
  
  	//Close connection
  	odbc_close($conn);

  	//echo return array as json string
  	echo json_encode($arr);
  } else {
  	$arr['results']['msg'] = array(
  		'text' => 'Not authorized.',
  		'type' => 'failure');
  	echo json_encode($arr['results']);
  }
}
