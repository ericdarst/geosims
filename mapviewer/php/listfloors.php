<?php
if ((!empty($_GET['FACNUM'])) && isset($_SERVER['HTTP_UWNETID'])) {
	require_once '../../common/php/common.php';
	$userNetid = $_SERVER['HTTP_UWNETID'];
	$astraAuthz = getAstraInfo($userNetid, false); //Get ASTRA authorizations for netid
	if (hasAuthz($astraAuthz)) { //If user is authorized
		require_once '../../common/php/login.php';
  	//Define response header
  	Header("Cache-Control: max-age=".$queryCache_MaxTime.",public");
  	//Define return array
  	$arr = array(
  		'request' => array(),
  		'results' => array());
  	$arr['request']['FACNUM'] = $_GET['FACNUM'];

  	$conn = createConn($db_username,$db_password,$db_server,$db_database);  //Connection property variables defined in login.php
  	
  	$facCode = getFacilityCode($conn, $arr['request']['FACNUM']);

  	if ($facCode) {
  		$stid = odbc_prepare($conn, "SELECT FLOOR_CODE FROM " . $tableFloorCode . " WHERE FACILITY_CODE = ? ORDER BY FLOOR_NUMBER DESC");
  		//oci_bind_by_name($stid, ":faccode_bv", $facCode, -1);
  		odbc_execute($stid, array($facCode));

  		$arr['results'] = processQuery($stid);

  		odbc_free_result($stid);
  	}
  	odbc_close($conn);
  	
  	echo json_encode($arr);
  } else {
  	$arr['results']['msg'] = array(
  		'text' => 'Not authorized.',
  		'type' => 'failure');
  	echo json_encode($arr['results']);
  }
}

?>
