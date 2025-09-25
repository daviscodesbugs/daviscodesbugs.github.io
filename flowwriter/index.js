var app = angular.module("myApp", ['ngclipboard']);

app.controller('myCtrl', function ($scope, $http, $document) {
	var uuid = generateUUID();
	var saveInterval = 15000;
	console.log("Generated UUID", uuid);
	console.log("Delta every", 10000 / 1000, "seconds");

	$scope.output = "";
	$scope.isRecording = false;
	$scope.changes = true;
	
	$scope.clear = function () {
		if ($scope.output == "") return;
		
		var webtask_url = "https://wt-8a5e2a05e58a7a05cf5d417a51918549-0.run.webtask.io/api";
		var data = {
			uuid: uuid,
			last_edited: new Date(),
			text: $scope.output
		}

		$http.post(webtask_url, data).then(successCallback, errorCallback);

		function successCallback(res) {
			console.log("Successfully reset");
			uuid = generateUUID();
			$scope.output = "";
		}

		function errorCallback(res) {
			console.log("Error:", res);
		}
	};

	setInterval(function() {
		if ($scope.output == "" || $scope.changes == false) return;

		var webtask_url = "https://wt-8a5e2a05e58a7a05cf5d417a51918549-0.run.webtask.io/api";
		var data = {
			uuid: uuid,
			last_edited: new Date(),
			text: $scope.output
		}

		$http.post(webtask_url, data).then(successCallback, errorCallback);

		function successCallback(res) {
			console.log("Delta backed.");
			$scope.changes = false;
		}

		function errorCallback(res) {
			console.log("Error:", res);
		}
		
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

function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
};