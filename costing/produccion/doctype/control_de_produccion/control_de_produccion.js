// Copyright (c) 2018, Yefri Tavarez and contributors
// For license information, please see license.txt

frappe.ui.form.on('Control de Produccion', {
	"setup": (frm) => {
		frm.trigger("add_fetchs");
		frm.trigger("set_queries");
	},
	"refresh": (frm) => {
		frm.trigger("show_hide_production_supervisor_fields");
	},
	"onload_post_render": (frm) => {
		frm.trigger("set_reqd_for_fields_related_to_workstation_state");
	},
	"add_fetchs": (frm) => {
		$.map([
			{"source_field": "is_qty_reqd", "target_field": "is_qty_reqd"},
			{"source_field": "is_project_reqd", "target_field": "is_project_reqd"},
		], (value) => frm.add_fetch("workstation_state", value.source_field, value.target_field));

		frm.add_fetch("production_order", "project", "project");
		frm.add_fetch("production_order", "project_name", "project_name");
	},
	"set_queries": (frm) => {
		frm.set_query("workstation_state", () => {
			return {
				"query": "costing.produccion.doctype.control_de_produccion.control_de_produccion.get_query_workstation",
				"filters": {
					"workstation": frm.doc.workstation
				}
			};
		});

		frm.set_query("workstation", () => {
			return {
				"query": "costing.produccion.doctype.orden_de_produccion.orden_de_produccion.get_query_production_order_station",
				"filters": {
					"production_order": frm.doc.production_order
				}
			};
		});
	},
	"workstation": (frm) => {
		if ( ! frm.doc.workstation) {
			frm.set_value("workstation_name", undefined);
		}
	},
	"employee": (frm) => {
		if ( ! frm.doc.employee) {
			frm.set_value("employee_name", undefined);
		}
	},
	"production_order": (frm) => {
		if ( ! frm.doc.production_order) {
			frm.trigger("hide_fields_related_to_workstation_state");
		}

		frm.trigger("clear_fields_related_to_workstation_state");
		frm.trigger("set_reqd_for_fields_related_to_workstation_state");
	},
	"workstation_state": (frm) => {
		frm.trigger("set_reqd_for_fields_related_to_workstation_state");
	},
	"hide_fields_related_to_workstation_state": (frm) => {
		let field_list = ["is_qty_reqd", "is_project_reqd", "operation_name"];
		$.map(field_list, (field) => frm.set_value(field, undefined));
	},
	"show_hide_production_supervisor_fields": (frm) => {
		frm.toggle_enable("time_stamp", frappe.user.has_role("Production Supervisor"));
	},
	"clear_fields_related_to_workstation_state": (frm) => {
		let field_list = ["qty", "project", "project_name", "workstation_state"];
		$.map(field_list, (field) => frm.set_value(field, undefined));
	},
	"set_reqd_for_fields_related_to_workstation_state": (frm) => {
		let field_list = [
			{"fieldname": "qty", "dependant_field": "is_qty_reqd"}, 
			{"fieldname": "production_order", "dependant_field": "is_project_reqd"},
			{"fieldname": "workstation_state", "dependant_field": "is_project_reqd"}
		];

		$.map(field_list, (value) => frm.toggle_reqd(value.fieldname, frm.doc[value.dependant_field]));
	},
});
