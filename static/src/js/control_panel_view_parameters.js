odoo.define('group_by_hour.controlPanelViewParameters', function (require) {
    "use strict";

    let core = require('web.core');
    let _lt = core._lt;
    let controlPanelViewParameters = require('web.controlPanelViewParameters');
    let GroupByMenu = require('web.GroupByMenu');
    let ControlPanelModel = require('web.ControlPanelModel');
    let GraphModel = require('web.GraphModel');
    const DEFAULT_INTERVAL = controlPanelViewParameters.DEFAULT_INTERVAL

    let INTERVAL_OPTIONS = [
        {description: _lt('Year'), optionId: 'year', groupId: 1},
        {description: _lt('Quarter'), optionId: 'quarter', groupId: 1},
        {description: _lt('Month'), optionId: 'month', groupId: 1},
        {description: _lt('Week'), optionId: 'week', groupId: 1},
        {description: _lt('Day'), optionId: 'day', groupId: 1},
        {description: _lt('Hour'), optionId: 'hour', groupId: 1},
    ];

    function rank(oId) {
        return INTERVAL_OPTIONS.findIndex(o => o.optionId === oId);
    }

    controlPanelViewParameters.INTERVAL_OPTIONS = INTERVAL_OPTIONS
    controlPanelViewParameters.rank = rank

    GroupByMenu.include({
        _addGroupby: function (fieldName) {
            var field = this.presentedFields.find(function (field) {
                return field.name === fieldName;
            });
            var groupBy = {
                type: 'groupBy',
                description: field.string,
                fieldName: fieldName,
                fieldType: field.type,
            };
            if (_.contains(['date', 'datetime'], field.type)) {
                groupBy.hasOptions = true;
                groupBy.options = INTERVAL_OPTIONS;
                groupBy.defaultOptionId = DEFAULT_INTERVAL;
                groupBy.currentOptionIds = new Set([]);
            }
            this.trigger_up('new_groupBy', groupBy);
        },
    })

    ControlPanelModel.include({

        rank(oId) {
            return INTERVAL_OPTIONS.findIndex(o => o.optionId === oId);
        },

        _insert(activeFilterIds, combinationId) {
            const filterId = combinationId[0];
            let firstIndex = -1;
            let lastIndex = -1;
            activeFilterIds.forEach((cId, i) => {
                if (cId[0] === filterId) {
                    firstIndex = firstIndex === -1 ? i : firstIndex;
                    lastIndex = i;
                }
            });
            if (firstIndex === -1) { // case A2 empty
                activeFilterIds.push(combinationId);
            } else { // case A2 non empty
                const a1 = activeFilterIds.slice(0, firstIndex);
                const a2 = activeFilterIds.slice(firstIndex, lastIndex + 1);
                const a3 = activeFilterIds.slice(lastIndex + 1);

                a2.push(combinationId);
                a2.sort((c1, c2) => rank(c1[1]) - rank(c2[1]));

                activeFilterIds = [].concat(a1, a2, a3);
            }
            return activeFilterIds;
        },
    })

    GraphModel.include({

        rank(oId) {
            return INTERVAL_OPTIONS.findIndex(o => o.optionId === oId);
        },

        _processGroupBy: function (groupBy) {
            const groupBysMap = new Map();
            for (const gb of groupBy) {
                let [fieldName, interval] = gb.split(':');
                const field = this.fields[fieldName];
                if (['date', 'datetime'].includes(field.type)) {
                    interval = interval || DEFAULT_INTERVAL;
                }
                if (groupBysMap.has(fieldName)) {
                    const registeredInterval = groupBysMap.get(fieldName);
                    if (rank(registeredInterval) < rank(interval)) {
                        groupBysMap.set(fieldName, interval);
                    }
                } else {
                    groupBysMap.set(fieldName, interval);
                }
            }
            return [...groupBysMap].map(([fieldName, interval]) => {
                if (interval) {
                    return `${fieldName}:${interval}`;
                }
                return fieldName;
            });
        },
    })
});
