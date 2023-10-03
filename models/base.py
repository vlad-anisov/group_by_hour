from odoo import models, api
import dateutil
import datetime
import pytz


class Base(models.AbstractModel):
    _inherit = "base"

    @api.model
    def _read_group_process_groupby(self, gb, query):
        """
        OVERRIDE
        Changed format for 'hour' from 'hh:00 dd MMM' to 'HH:00 dd MMM'.
        """
        split = gb.split(':')
        field = self._fields.get(split[0])
        if not field:
            raise ValueError("Invalid field %r on model %r" % (split[0], self._name))
        field_type = field.type
        gb_function = split[1] if len(split) == 2 else None
        temporal = field_type in ('date', 'datetime')
        tz_convert = field_type == 'datetime' and self._context.get('tz') in pytz.all_timezones
        qualified_field = self._inherits_join_calc(self._table, split[0], query)
        if temporal:
            display_formats = {
                # group_by_hour: Changes start
                'hour': 'HH:00 dd MMM',
                # group_by_hour: Changes end
                'day': 'dd MMM yyyy',
                'week': "'W'w YYYY",
                'month': 'MMMM yyyy',
                'quarter': 'QQQ yyyy',
                'year': 'yyyy',
            }
            time_intervals = {
                'hour': dateutil.relativedelta.relativedelta(hours=1),
                'day': dateutil.relativedelta.relativedelta(days=1),
                'week': datetime.timedelta(days=7),
                'month': dateutil.relativedelta.relativedelta(months=1),
                'quarter': dateutil.relativedelta.relativedelta(months=3),
                'year': dateutil.relativedelta.relativedelta(years=1)
            }
            if tz_convert:
                qualified_field = "timezone('%s', timezone('UTC',%s))" % (
                self._context.get('tz', 'UTC'), qualified_field)
            qualified_field = "date_trunc('%s', %s::timestamp)" % (gb_function or 'month', qualified_field)
        if field_type == 'boolean':
            qualified_field = "coalesce(%s,false)" % qualified_field
        return {
            'field': split[0],
            'groupby': gb,
            'type': field_type,
            'display_format': display_formats[gb_function or 'month'] if temporal else None,
            'interval': time_intervals[gb_function or 'month'] if temporal else None,
            'tz_convert': tz_convert,
            'qualified_field': qualified_field,
        }
