<?php
//Define return array
$arr = array(
	//'request' => $_GET["q"],
	'items' => array() );

if (isset($_GET["q"]) && isset($_SERVER['HTTP_UWNETID'])) {
  require_once 'common.php';
  $userNetid = $_SERVER['HTTP_UWNETID'];
	$astraAuthz = getAstraInfo($userNetid, false); //Get ASTRA authorizations for netid
	if (hasAuthz($astraAuthz)) { //If user is authorized
	  require_once 'login.php';
  	$request = $_GET["q"]; //The requested search string

  	$conn = createConn($db_username,$db_password,$db_server,$db_database);  //Connection property variables defined in login.php

  	//Query string.  Results limited to 1000 entries.
  	$queryStr = "SELECT FUNCTIONAL_USE_CODE, DESCRIPTION as DESCR "
  					  . "FROM " . $tableFuncUseCode . " ";
    if ($request != '') $queryStr .= "WHERE PATINDEX('%'+?+'%',DESCRIPTION) != 0"; //Query on search string if search string is defined
    $queryStr .= "ORDER BY DESCRIPTION ASC";

  	$stid = odbc_prepare($conn, $queryStr);
		$bind_array = array();
  	if ($request != '') $bind_array[] = $request; //Bind query variable if search string is defined
  	odbc_execute($stid, $bind_array);

  	$arr['items'] = processQuery($stid);
  	$arr['identifier'] = 'FUNCTIONAL_USE_CODE';

  	odbc_free_result($stid);
  	odbc_close($conn);
  }
}

echo json_encode($arr);
