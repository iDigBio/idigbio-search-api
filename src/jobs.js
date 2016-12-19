
import _ from "lodash";

import config from "config";

import * as recordsets from "lib/recordsets";
import * as indexTerms from "lib/indexTerms";
import timer from "lib/timer";

const jobs = [
  {job: recordsets.loadAll, time: 1000 * 60 * 60},
  {job: indexTerms.loadIndexTerms, time: 1000 * 60 * 60}
];

export default function startJobs() {
  _.each(jobs, function(jobDesc) {
    var repeater = function() {
      const {job, time} = jobDesc;
      timer(job)()
        .then(() => setTimeout(repeater, time));
    };
    setTimeout(repeater);
  });
}
