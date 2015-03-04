

exports.toSearchTitle = function(show) {
	var returnShow = show.replace(/\s/g, '.').replace(/["'()]/g, '').replace(/&/g, 'and');
	return returnShow;
};