var app = angular.module("myApp", ['ngclipboard']);

app.controller('myCtrl', function ($scope, $http, $document) {
	var storageKey = "flowwriter_text";
	var saveInterval = 15000;

	$scope.output = localStorage.getItem(storageKey) || "";
	$scope.isRecording = false;
	$scope.changes = true;
	
	$scope.clear = function () {
		if ($scope.output == "") return;

		localStorage.setItem(storageKey, $scope.output);
		console.log("Text backed up to localStorage");
		$scope.output = "";
		localStorage.removeItem(storageKey);
	};

	setInterval(function() {
		if ($scope.output == "" || $scope.changes == false) return;

		localStorage.setItem(storageKey, $scope.output);
		console.log("Text auto-saved to localStorage");
		$scope.changes = false;

	}, 15000);
});

app.filter('mostRecent', function () {
	return function (x) {
		if (x) {
			// 11% faster than slice
			return x.substring(x.length - 1, x.length);
		}
	};
});

app.directive('captureKeypresses', function ($document) {
	return {
		restrict: 'A',
		scope: false,
		link: function (scope) {
			$document.bind('keypress', function (e) {
				if (scope.isRecording) {
					scope.changes = true;
					if (e.key == 'Enter') {
						scope.output += "\n";
					} else {
						scope.output += e.key;
					}
					scope.$apply();
				}
			});
		}
	};
});

$('#copy').webuiPopover({
	content: 'copied!',
	autoHide: 500
});

$("body").keypress(function (event) {
	$("#most-recent")
		.finish()
		.fadeIn({ duration: 5 });
	$("#most-recent")
		.finish()
		.fadeOut({ duration: 200 });
});

