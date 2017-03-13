var test = require('tape');
var TeamCityPlugin = require('../index')

test('skip list can handle user input', function (t) {
  t.deepEqual(TeamCityPlugin._generateSkipList('rps'), ['timestamp', 'latencies', 'rps'], 'Single Value');
  t.deepEqual(TeamCityPlugin._generateSkipList('rps,errors'), ['timestamp', 'latencies', 'rps', 'errors'], 'No Spaces');
  t.deepEqual(TeamCityPlugin._generateSkipList('rps, errors, codes'), ['timestamp', 'latencies', 'rps', 'errors', 'codes'], 'Spaces');
  t.end();
});

test('flattening works', function (t) {
  var commonSkipList = ['timestamp', 'latencies'];

  var basic = {
    basic: 500
  };
  var basicPlusSkipped = {
    basic: 500,
    timestamp: '2016-10-31T08:35:21.676Z',
    latencies: [[1477902921336,'761465ff-220d-4924-b1c1-062868d3169b',428076699,301],[1477902921342,'e8fa92e9-50bf-4d67-bce9-f7bc8e3687ee',259315569,301]]
  };
  var nullProperty = {
    scenariosCreated: null
  }
  var emptyProperty = {
    errors: {}
  }
  var subProperties = {
    customStats: {
      so:{
        value: 10,
        many: {
          value: 11,
          properties: {
            value: 12
          }
        }
      }
    }
  };
  var flatSubProperties = { 'customStats.so.many.properties.value': 12, 'customStats.so.many.value': 11, 'customStats.so.value': 10 };
  var flatSubPropertiesSingleSkip = {'customStats.so.many.properties.value': 12, 'customStats.so.value': 10 };

  t.deepEqual(TeamCityPlugin._flattenStats('', basic, commonSkipList, 0), basic, 'Basic in, basic out');
  t.deepEqual(TeamCityPlugin._flattenStats('', basicPlusSkipped, commonSkipList, 0), basic, 'Basic plus skipped in, basic out');
  t.deepEqual(TeamCityPlugin._flattenStats('', basicPlusSkipped, commonSkipList.concat(['basic']), 0), {}, 'Basic plus skipped in, basic skipped, nothing out');
  t.deepEqual(TeamCityPlugin._flattenStats('', nullProperty, commonSkipList, 0), {scenariosCreated: 0}, 'Null in, default out');
  t.deepEqual(TeamCityPlugin._flattenStats('', emptyProperty, commonSkipList, 0), {}, 'Empty objects skipped');
  t.deepEqual(TeamCityPlugin._flattenStats('', subProperties, commonSkipList, 0), flatSubProperties, 'All the sub properties can come to the party');
  t.deepEqual(TeamCityPlugin._flattenStats('', subProperties, commonSkipList.concat(['customStats.so.many.value']), 0), flatSubPropertiesSingleSkip, 'Sub properties can be skipped');
  t.deepEqual(TeamCityPlugin._flattenStats('', subProperties, commonSkipList.concat(['customStats.so']), 0), {}, 'Skipping a parent property skips all children');


  t.end();
});
