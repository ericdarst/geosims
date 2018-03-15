<?php
//Define return array
$arr = array(
	//'request' => $_GET["q"],
	'items' => array() );

if ((!empty($_GET["q"])) && isset($_SERVER['HTTP_UWNETID'])) {
  require_once 'common.php';
  $userNetid = $_SERVER['HTTP_UWNETID'];
	$astraAuthz = getAstraInfo($userNetid, false); //Get ASTRA authorizations for netid
	if (hasAuthz($astraAuthz)) { //If user is authorized
	  require_once 'login.php';
  	$request = $_GET["q"]; //The requested search string

  	$conn = createConn($db_username,$db_password,$db_server,$db_database);  //Connection property variables defined in login.php
  	
  	//Check if search string is numeric.  If so, process as org code and query on EMPLOYEE_ID.
  	//If not, query by EMPLOYEE_NAME.
  	if (is_numeric($request)) {
  		$reqLen = strlen($request);
  		if ($reqLen == 9) {
  			$bvVal = $request;
  			$queryCol = 'EmployeeID';
  		}
  	} else {
  		$bvVal = $request;
  		$queryCol = 'DisplayName';
  	}
  	
  	if (isset($queryCol)) {
    	//Query string.  Results limited to 100 entries.
    	$queryStr = "SELECT TOP 50 EmployeeID as EMPLOYEE_ID, EmployeeID + ' - ' + RTRIM(DisplayName) as DESCR "
    					  . "FROM " . $tableEmployee . " "
    					  . "WHERE PATINDEX('%'+?+'%'," . $queryCol . ") != 0 "
    					  . "ORDER BY DisplayName ASC";
    	
    	$stid = odbc_prepare($conn, $queryStr);
    	//oci_bind_by_name($stid,":reqVal_bv",$bvVal); //Bind query variable
    	odbc_execute($stid, array($request));

    	$arr['items'] = processQuery($stid);
    	$arr['identifier'] = 'EMPLOYEE_ID';

    	odbc_free_result($stid);
			odbc_close($conn);
    }
  }
}

echo json_encode($arr);
