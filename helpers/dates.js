const moment = require('moment');


 const dateSeries = async (startDate,endDate) => {

    try {

        var series = [];
        var end = true;

        while (end) {
            series.push(moment(startDate).format('YYYY-MM-DD'));
            startDate = moment(startDate).add(1,'days');
            end = moment(startDate).isSameOrBefore(endDate);

        }
        return series;
        
    } catch (error) {
        
    }

 }
 module.exports = {
    dateSeries
}