'use strict';

System.register(['app/core/config', 'app/core/app_events', 'app/plugins/sdk', 'lodash', 'moment'], function (_export, _context) {
  "use strict";

  var config, appEvents, PanelCtrl, _, moment, _createClass, InfluxAdminCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  return {
    setters: [function (_appCoreConfig) {
      config = _appCoreConfig.default;
    }, function (_appCoreApp_events) {
      appEvents = _appCoreApp_events.default;
    }, function (_appPluginsSdk) {
      PanelCtrl = _appPluginsSdk.PanelCtrl;
    }, function (_lodash) {
      _ = _lodash.default;
    }, function (_moment) {
      moment = _moment.default;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _export('PanelCtrl', InfluxAdminCtrl = function (_PanelCtrl) {
        _inherits(InfluxAdminCtrl, _PanelCtrl);

        function InfluxAdminCtrl($scope, $injector, $q, $rootScope, $timeout) {
          _classCallCheck(this, InfluxAdminCtrl);

          var _this = _possibleConstructorReturn(this, (InfluxAdminCtrl.__proto__ || Object.getPrototypeOf(InfluxAdminCtrl)).call(this, $scope, $injector));

          _this.datasourceSrv = $injector.get('datasourceSrv');
          _this.injector = $injector;
          _this.q = $q;
          _this.query = "SHOW DIAGNOSTICS";
          _this.$timeout = $timeout;

          _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
          _this.events.on('render', _this.onRender.bind(_this));
          _this.events.on('panel-initialized', _this.onPanelInitalized.bind(_this));
          _this.events.on('refresh', _this.onRefresh.bind(_this));

          // defaults configs
          var defaults = {
            mode: 'current', // 'write', 'query'
            updateEvery: 1100
          };
          _this.panel = $.extend(true, defaults, _this.panel);

          // All influxdb datasources
          _this.dbs = [];
          _.forEach(config.datasources, function (val, key) {
            if ("influxdb" == val.type) {
              if (key == config.defaultDatasource) {
                _this.dbs.unshift(key);
              } else {
                _this.dbs.push(key);
              }
            }
          });

          // pick a datasource
          if (_.isNil(_this.panel.datasource)) {
            if (_this.dbs.length > 0) {
              _this.panel.datasource = _this.dbs[0];
            }
          }

          _this.queryInfo = {
            last: 0,
            count: 0,
            queries: []
          };

          if (_this.panel.updateEvery > 0) {
            _this.updateShowQueries();
          }
          return _this;
        }

        _createClass(InfluxAdminCtrl, [{
          key: 'onInitEditMode',
          value: function onInitEditMode() {
            this.addEditorTab('Options', 'public/plugins/natel-influx-admin/editor.html', 1);
            this.editorTabIndex = 1;
          }
        }, {
          key: 'setQuery',
          value: function setQuery(q) {
            this.query = q;

            console.log("Set Query: ", q);
          }
        }, {
          key: 'askToKillQuery',
          value: function askToKillQuery(qinfo) {
            var _this2 = this;

            appEvents.emit('confirm-modal', {
              title: 'Kill Influx Query',
              text: 'Are you sure you want to kill this query?',
              text2: qinfo.query,
              icon: 'fa-trash',
              //confirmText: 'yes',
              yesText: 'Kill Query',
              onConfirm: function onConfirm() {
                _this2.datasourceSrv.get(_this2.panel.datasource).then(function (ds) {
                  ds._seriesQuery('kill query ' + qinfo.id).then(function (res) {
                    console.log('killed', qinfo, res);
                  });
                });
              }
            });
            return;
          }
        }, {
          key: 'updateShowQueries',
          value: function updateShowQueries() {
            var _this3 = this;

            return this.datasourceSrv.get(this.panel.datasource).then(function (ds) {
              return ds._seriesQuery('SHOW QUERIES').then(function (data) {
                var temp = [];
                _.forEach(data.results[0].series[0].values, function (res) {

                  // convert the time (string) to seconds (so that sort works!)
                  var durr = res[3];
                  var unit = durr[durr.length - 1];
                  var mag = 0;
                  if (unit == 's') {
                    mag = 1;
                  } else if (unit == 'm') {
                    mag = 60;
                  } else if (unit == 'h') {
                    mag = 60 * 60;
                  }
                  var secs = parseInt(durr.substring(0, durr.length - 1)) * mag;

                  temp.push({
                    'secs': secs,
                    'time': res[3],
                    'query': res[1],
                    'db': res[2],
                    'id': res[0]
                  });
                });

                _this3.queryInfo.count++;
                _this3.queryInfo.last = Date.now();
                _this3.queryInfo.queries = temp;
                console.log("QUERIES", _this3.currentQueries);

                // Check if we should refresh the view
                if ('current' == _this3.panel.mode && _this3.panel.updateEvery > 0) {
                  _this3.queryInfo.timer = _this3.$timeout(function () {
                    _this3.updateShowQueries();
                  }, _this3.panel.updateEvery);
                }
                return Promise.resolve(temp);
              });
            });
          }
        }, {
          key: 'modeChanged',
          value: function modeChanged() {
            if ('current' == this.panel.mode) {
              this.updateShowQueries();
            }
            this.render();
          }
        }, {
          key: 'getQueryTemplates',
          value: function getQueryTemplates() {
            return [{ text: 'Show Databases', click: "ctrl.setQuery('SHOW DATABASES')" }, { text: 'Create Database', click: "ctrl.setQuery('CREATE DATABASE &quot;db_name&quot;')" }, { text: 'Drop Database', click: "ctrl.setQuery('DROP DATABASE &quot;db_name&quot;')" }, { text: '--' }, { text: 'Show Measurements', click: "ctrl.setQuery('SHOW MEASUREMENTS')" }, { text: 'Show Tag Keys', click: "ctrl.setQuery('SHOW TAG KEYS FROM &quot;measurement_name&quot;')" }, { text: 'Show Tag Values', click: "ctrl.setQuery('SHOW TAG VALUES FROM &quot;measurement_name&quot; WITH KEY = &quot;tag_key&quot;')" }, { text: '--' }, { text: 'Show Retention Policies', click: "ctrl.setQuery('SHOW RETENTION POLICIES ON &quot;db_name&quot;')" }, { text: 'Create Retention Policy', click: "ctrl.setQuery('CREATE RETENTION POLICY &quot;rp_name&quot; ON &quot;db_name&quot; DURATION 30d REPLICATION 1 DEFAULT')" }, { text: 'Drop Retention Policy', click: "ctrl.setQuery('DROP RETENTION POLICY &quot;rp_name&quot; ON &quot;db_name&quot;')" }, { text: '--' }, { text: 'Show Continuous Queries', click: "ctrl.setQuery('SHOW CONTINUOUS QUERIES')" }, { text: 'Create Continuous Query', click: "ctrl.setQuery('CREATE CONTINUOUS QUERY &quot;cq_name&quot; ON &quot;db_name&quot; BEGIN SELECT min(&quot;field&quot;) INTO &quot;target_measurement&quot; FROM &quot;current_measurement&quot; GROUP BY time(30m) END')" }, { text: 'Drop Continuous Query', click: "ctrl.setQuery('DROP CONTINUOUS QUERY &quot;cq_name&quot; ON &quot;db_name&quot;')" }, { text: '--' }, { text: 'Show Users', click: "ctrl.setQuery('SHOW USERS')" }, { text: 'Create User', click: "ctrl.setQuery('CREATE USER &quot;username&quot; WITH PASSWORD 'password'')" }, { text: 'Create Admin User', click: "ctrl.setQuery('CREATE USER &quot;username&quot; WITH PASSWORD 'password' WITH ALL PRIVILEGES')" }, { text: 'Drop User', click: "ctrl.setQuery('DROP USER &quot;username&quot;')" }, { text: '--' }, { text: 'Show Stats', click: "ctrl.setQuery('SHOW STATS')" }, { text: 'Show Diagnostics', click: "ctrl.setQuery('SHOW DIAGNOSTICS')" }];
          }
        }, {
          key: 'onSubmit',
          value: function onSubmit() {
            var _this4 = this;

            this.datasourceSrv.get(this.panel.datasource).then(function (ds) {
              console.log('ds', ds, _this4.query);
              ds._seriesQuery(_this4.query).then(function (data) {
                console.log("RSP", _this4.query, data);
                _this4.rsp = data;
              });
            });
          }
        }, {
          key: 'onPanelInitalized',
          value: function onPanelInitalized() {
            console.log("onPanelInitalized()");
          }
        }, {
          key: 'onRender',
          value: function onRender() {
            console.log("onRender");
          }
        }, {
          key: 'onRefresh',
          value: function onRefresh() {
            if ('current' == this.panel.mode) {
              this.updateShowQueries();
            }
            console.log("onRefresh");
          }
        }]);

        return InfluxAdminCtrl;
      }(PanelCtrl));

      InfluxAdminCtrl.templateUrl = 'module.html';

      _export('PanelCtrl', InfluxAdminCtrl);
    }
  };
});
//# sourceMappingURL=module.js.map