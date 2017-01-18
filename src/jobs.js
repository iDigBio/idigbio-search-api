
import _ from "lodash";

import config from "config";

import {loadAll as loadAllRecordsets}  from "lib/recordsets";
import {loadIndexTerms} from "lib/indexTerms";
import timer from "lib/timer";

const jobs = [
  {job: loadAllRecordsets, time: 1000 * 60 * 60},
  {job: loadIndexTerms, time: 1000 * 60 * 60}
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
