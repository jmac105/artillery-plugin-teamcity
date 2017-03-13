var l = require('lodash');
var debug = require('debug')('plugins:teamcity');

function TeamCityPlugin(rawConfig, ee) {
  var self = this;
  self._report = [];

  var config = _reconcileConfigs(rawConfig);

  ee.on('done', function(stats) {
    debug('Stats Report from Artillery: '+JSON.stringify(stats));

    if (config.enableUselessReporting) {
      self._report.push({ timestamp: stats.timestamp, value: 'test' });
    }

    var flattenedStats = _flattenStats('',stats, config.skipList, config.defaultValue);
    debug('Flattened Stats Report: '+JSON.stringify(flattenedStats));

    console.log('TeamCity build statistics:');
    l.each(flattenedStats, function(value, name) {
      debug('Reporting: '+name+'  '+value);
      console.log('##teamcity[buildStatisticValue key=' + name + ' value=' + value + ']');
    });

  });

  return this;
}


TeamCityPlugin.prototype.report = function report() {
  if (this._report.length === 0) {
    return null;
  } else {
    this._report.push({
      timestamp: 'aggregate',
      value: {test: 'aggregate test'}
    });
    return this._report;
  }
};

// Parses the stats object and sub objects to gauge stats
function _flattenStats(prefix, value, skipList, defaultValue){
  var flattenedStats = {};
  // Skip logic
  if(l.contains(skipList, prefix)){
    debug(prefix+' skipped');
    return {};
  }

  // Recursively loop through objects with sub values such as latency/errors
  if(l.size(value) > 0){
    l.each(value, function(subValue, subName) {
      var newPrefix = prefix;
      if(newPrefix==='') {
        newPrefix = subName;
      }
      else {
        newPrefix += '.'+subName;
      }
      flattenedStats =  l.merge(flattenedStats, _flattenStats(newPrefix, subValue, skipList, defaultValue));
    });
  }
  // Hey, it is an actual stat!
  else if(l.isFinite(value)){
    flattenedStats = l.merge(flattenedStats,{[prefix]: value});
  }
  // Artillery is sending null or NaN.
  else if(l.isNaN(value) || l.isNull(value)){
    flattenedStats = l.merge(flattenedStats,{[prefix]: defaultValue});
  }
  // Empty object such as 'errors' when there are not actually errors
  else{
    debug(prefix+' has nothing to report');
    // no-op
  }
  return flattenedStats;
}

function _reconcileConfigs(config){
  return {
     prefix: config.plugins.teamcity.prefix || 'artillery',
     closingTimeout: config.plugins.teamcity.timeout || 0,
     defaultValue: config.plugins.teamcity.default || 0,
     skipList: _generateSkipList(config.plugins.teamcity.skipList),
    // This is used for testing the plugin interface
     enableUselessReporting: config.plugins.teamcity.enableUselessReporting
  }
}

function _generateSkipList(input){
  let skipList = ['timestamp', 'latencies']; //always skip these

  // Add any values passed in by the user
  if (l.isString(input)){
    let inputWithoutSpaces = input.replace(/\s/g,'');
    skipList = skipList.concat(inputWithoutSpaces.split(','));
  }
  return skipList;
}

module.exports = TeamCityPlugin;

// Exported for testing purposes...
module.exports._generateSkipList = _generateSkipList;
module.exports._flattenStats = _flattenStats;
