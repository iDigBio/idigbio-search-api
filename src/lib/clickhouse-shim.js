/* eslint-disable require-jsdoc */
import config from "config";
const request = require('request');

// eslint-disable-next-line max-params, max-statements
export async function queryStats(type, recordset, dateInterval, minDate, maxDate, inverted) {

    let qurl = `${config.clickhouse.server}/${type}`;

    if(dateInterval) {
        qurl = qurl.concat(`?dateInterval=${dateInterval}`);
    }

    if(recordset) {
        qurl = qurl.concat(`&recordset=${recordset}`);
    }

    if(minDate) {
        qurl = qurl.concat(`&minDate=${minDate}`);
    }

    if(maxDate) {
        qurl = qurl.concat(`&maxDate=${maxDate}`);
    }

    if(inverted) {
        qurl = qurl.concat(`&inverted=${inverted}`);
    }

    return new Promise((resolve, reject) => {
        request(
            {
                url: qurl,
                json: true
            },
            (error, response, body) => {
                if(error) {
                    return reject(error);
                }
                if(response.statusCode !== 200) {
                    return reject(new Error(`HTTP error! Status: ${response.statusCode}`));
                }
                return resolve(body);
            }
        );
    });
}
