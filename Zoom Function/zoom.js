$(document).ready(function() {

	$zoom_pane = $("#zoom_pane");
	
	$zoom_pane.panzoom({
		increment: 0.4,
		minScale: 1,
		maxScale: 2.2,
		duration: 600,
		$zoomIn: $("#zoom_in"),
		$zoomOut: $("#zoom_out"),
		$zoomRange: $("#zoom_range"),
		$reset: $("#reset")
	});
	
	function zoom() {
		$placeholder = $(".placeholder");
		$placeholderZoom = $(".placeholder_zoom");
		var scale = $zoom_pane.panzoom("getMatrix")[0];
		var newScale = 1.0/scale;
		var newScaleStyle = "scale(" + newScale + "," + newScale + ")";
		var newWidth = (100*scale) + "%";
		$placeholder.fadeOut(400, function() {
			$placeholderZoom.css({
				"transform":newScaleStyle,
				"-webkit-transform":newScaleStyle,
				"transform-origin":"left top",
				"-webkit-transform-origin":"left top",
				"width":newWidth,
				"height":newWidth
			});
			$placeholder.fadeIn(600);
		});
	}
	
	$("#zoom_in").click(function() {
		zoom();
	});
	
	$("#zoom_out").click(function() {
		zoom();
	});
	
	$("#reset").click(function() {
		zoom();
	});
	
	$("#zoom_range").mousedown(function() {
		$placeholder = $(".placeholder");
		$placeholder.fadeOut(400);
	});
	
	$("#zoom_range").mouseup(function() {
		$placeholder = $(".placeholder");
		$placeholderZoom = $(".placeholder_zoom");
		var scale = $zoom_pane.panzoom("getMatrix")[0];
		var newScale = 1.0/scale;
		var newScaleStyle = "scale(" + newScale + "," + newScale + ")";
		var newWidth = (100*scale) + "%";
		$placeholderZoom.css({
			"transform":newScaleStyle,
			"-webkit-transform":newScaleStyle,
			"transform-origin":"left top",
			"-webkit-transform-origin":"left top",
			"width":newWidth,
			"height":newWidth
		});
		$placeholder.fadeIn(600);
	});
	
});