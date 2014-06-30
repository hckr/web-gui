<?php

switch($_GET['s']) {

case 'home': readfile('inc/home.html'); break;
case 'about-me': readfile('inc/about-me.html'); break;
default: echo 'Under construction.';

}

?>