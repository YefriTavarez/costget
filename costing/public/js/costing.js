// Copyright (c) 2018, Yefri Tavarez and contributors
// For license information, please see license.txt

$.extend(frappe.datetime, {
	"fmt": "YYYY-MM-DD",
	"lfmt": "YYYY-MM-DD HH:mm:ss",
	"get_weekday": function(date) {
		return {
			"0": "SATURDAY",
			"1": "SUNDAY",
			"2": "MONDAY",
			"3": "TUESDAY",
			"4": "WEDNESDAY",
			"5": "THURSDAY",
			"6": "FRIDAY",
		}[this.get_diff(date, "2000-01-01 00:00:00") % 7];
	},
	"is_working_day": function(date) {
		let is_working_day = true;

		if (["SATURDAY", "SUNDAY"].includes(this.get_weekday(date))) {
			is_working_day = false;		
		} else if (frappe.boot.year_holidays.includes(date)) {
			is_working_day = false;		
		}

		return is_working_day;
	},
	"get_next_working_date": function(date) {
		let moment_js = moment(date);

		if (moment_js.hour() <= 8) {
			moment_js.add("hours", cint(8) - moment_js.hour());
		} else if (moment_js.hour() >= 18) {
			moment_js.add("hours", cint(32) - moment_js.hour());
		} 

		if (this.is_working_day(moment_js.format(this.fmt))) {
			return moment_js.format(this.lfmt);
		}

		while ( ! this.is_working_day(moment_js.format(this.fmt))) {
			moment_js.add("days", 1);
		}

		return moment_js.format(this.lfmt);
	},
	"get_previous_working_date": function(date) {
		let moment_js = moment(date);

		if (moment_js.hour() < 8) {
			moment_js.add("hours", cint(8) - moment_js.hour());
		} else if (moment_js.hour() > 18) {
			moment_js.add("hours", cint(18) - moment_js.hour());
		} 


		if (this.is_working_day(moment_js.format(this.fmt))) {
			return moment_js.format(this.lfmt);
		}

		while ( ! this.is_working_day(moment_js.format(this.fmt))) {
			moment_js.add("days", -1);
		}

		return moment_js.format(this.lfmt);
	},
	"get_working_hours": function(from_date, to_date) {
		let from_moment_js = moment(from_date);
		let to_moment_js = moment(to_date);
		let date_array = [];

		let days_in_between = to_moment_js.diff(from_moment_js, "days");
		let working_hours = 0;

		for (index = 0; index < days_in_between; index ++) {
			let string_date = from_moment_js.add("days", 1).format(this.lfmt);
			date_array.push(string_date);

			if (this.is_working_day(string_date)) {
				working_hours += 8;
			}
		}

		if (to_moment_js.hour() > 14 && from_moment_js.hour() < 12) {
			working_hours -= 2;
		}

		return cint(working_hours) + to_moment_js.diff(from_moment_js, "hours");
	},
	"latest_date_was_set": function(frm, fromfield) {
		let fields = [
			"expected_start_date",
			"pre_expected_end_time",
			"print_expected_end_time",
			"cutter_expected_end_time",
			"options_control_expected_end_time",
			"options_cutter_expected_end_time",
			"options_union_expected_end_time",
			"options_folding_expected_end_time",
			"options_protection_expected_end_time_1",
			"options_protection_expected_end_time_2",
			"options_utility_expected_end_time_1",
			"options_utility_expected_end_time_2",
			"options_utility_expected_end_time_3",
			"options_texture_expected_end_time_1",
			"options_texture_expected_end_time_2",
			"options_packing_expected_end_time"
		];

		return $.grep(fields, (value) => {
			if (fields.indexOf(value) <= fields.indexOf(fromfield || "options_packing_expected_end_time")) {
				if (frm.doc[value]) {
					return true;
				}
			}
		}).map((value) => {
			return frm.doc[value];
		}).reduce((a, b) => { 
			return a > b ? a : b; 
		});
	}
});
