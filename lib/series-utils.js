

exports.toSearchTitle = function(show) {
	var returnShow = show.replace(' ', '.').replace('\'', '').replace('(', '').replace(')', '');
	return returnShow;
};