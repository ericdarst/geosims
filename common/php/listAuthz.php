<?php
if (isset($_SERVER['HTTP_UWNETID'])) {
	require_once 'common.php';
	$request = json_decode($_POST["json"], true);
	$userNetid = $_SERVER['HTTP_UWNETID'];
	$astraAuthz = array('netid' => $userNetid,
											'authz' => getAstraInfo($userNetid, (isset($request['reload']) ? $request['reload'] : false)),
											'expires' => '28800');
	echo json_encode($astraAuthz);
}
?>
