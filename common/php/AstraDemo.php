<?php

// Include the library
include "Astra.php";

/*
$included_files = get_included_files();

foreach ($included_files as $filename) {
    echo "$filename\n";
}

echo "<br/>";
echo $_SERVER['REMOTE_USER'];
echo "<br/>";
*/


class AstraDemo 
{

function getAstraInfo() {


	$current_user = substr("$_SERVER[REMOTE_USER]",6);
    // Create the object
    $myAstra = new Astra();
	echo $current_user;	

    // Do a query, note that the EnvCode specifies what environment ASTRA authorizations
    // are being retrieved from.  "EVAL" is from the evaluation environment, "PROD" is the
    // production environment. 
    $responses = $myAstra->GetAuthz(array("NetID"=>"$current_user","EnvCode"=>"prod", "PrivCode"=>"SIMS"));
	//$responses = $myAstra->GetAuthz(array("NetID"=>"aaronch","EnvCode"=>"prod", "PrivCode"=>"SIMS"));
    //$responses = $myAstra->GetAuthz(array("NetID"=>"opbauto","EnvCode"=>"eval", "PrivCode"=>"SIMS"));
    //$responses = $myAstra->GetAuthz(array("NetID"=>"opbauto","EnvCode"=>"eval", "PrivCode"=>"2030000000"));
    //$responses = $myAstra->GetAuthz(array("NetID"=>"opbauto","EnvCode"=>"prod", "PrivCode"=>"2030000000"));

	//$responses = $myAstra->GetAuthz(array("NetID"=>"aaronch","EnvCode"=>"PROD", "PrivCode"=>"SIMS"));
    // Print results.
    //var_dump($responses);
    echo "Response count: " . count($responses) . "<br/>";

    foreach ($responses as $response) {
        echo "<br/><br/>RESPONSE<br/>";
        echo "UWNetID: " . $response->party->uwNetid . "<br/>";
        echo "Env Code: " . $response->environment->code . "<br/>";
        echo "Priv Code: " . $response->privilege->code. "<br/>";
        echo "Role: " . $response->role->code. "<br/>";
        echo "spanOfControl(s): <br/>";
        foreach ($response->spanOfControlCollection as $spanOfControl) {
        echo "  Code: " . $spanOfControl->code . "<br/>";
        echo "  Desc: " . $spanOfControl->codeDescription . "<br/>";
        }
    }
    echo "<br>";
 }
}

$myAstrDemo = new AstraDemo();
$myAstrDemo->getAstraInfo();

//echo "Your UW NetID: "$_SERVER[REMOTE_USER];

?>
