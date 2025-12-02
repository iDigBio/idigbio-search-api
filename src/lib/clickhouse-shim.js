/* eslint-disable require-jsdoc */
import _ from "lodash";

// import logger from "logging";
var logger = require('winston');

const request = require('request');

export async function queryStats(type) {
    return new Promise((resolve, reject) => {
        request(
            {
                url: `http://localhost:8888/v2/summary/stats/${type}`,
                json: true
            },
            (error, response, body) => {
                if(error) {
                    return reject(error);
                }
                if(response.statusCode !== 200) {
                    return reject(new Error(`HTTP error! Status: ${response.statusCode}`));
                }
                resolve(body);
            }
        );
    });
}
