frappe.provide("costing.production_order");

costing.production_order = {
	"depends_on_list": [
		"pre_operation",
		"print_operation",
		"has_precut", 
		"options_control_operation", 
		"options_protection_operation_1", 
		"options_protection_operation_2", 
		"options_cutter_operation", 
		"options_union_operation", 
		"options_folding_operation", 
		"options_utility_operation_1", 
		"options_utility_operation_2", 
		"options_utility_operation_3", 
		"options_texture_operation_1", 
		"options_texture_operation_2", 
		"options_packing_operation",
	],
	"status_field_list": [
		"options_pre_status", 
		"options_print_status", 
		"cutter_status", 
		"options_control_status", 
		"options_protection_status_1", 
		"options_protection_status_2", 
		"options_cutter_status", 
		"options_union_status", 
		"options_folding_status", 
		"options_utility_status_1", 
		"options_utility_status_2", 
		"options_utility_status_3", 
		"options_texture_status_1", 
		"options_texture_status_2", 
		"options_packing_status", 
	]
};

frappe.listview_settings["Orden de Produccion"] = {
	"add_fields": new Array()
		.concat(costing.production_order.status_field_list,
			costing.production_order.depends_on_list),
	"get_indicator": (row) => {
		let completed = true;
		let started = false;
		let stopped = false;

		let depends_on_list = costing.production_order.depends_on_list;

		$.each(costing.production_order.status_field_list, (key, value) => {
			if (row[value] != "Completada" && row[depends_on_list[key]]) {
				completed = false;
			}
			
			if (row[value] != "Pendiente") {
				started = true;
			}

			if (row[value] == "Detenida") {
				stopped = true;
			}
		});

		if (completed) {
			return ['Completado', "green", "docstatus,!=,2"];
		} else if (stopped) {
			return ['Detenida', "red", "docstatus,!=,2"];
		} else if (started) {
			return ['En Proceso', "blue", "docstatus,!=,2"];
		} else {
			return ['Para Empezar', "orange", "docstatus,!=,2"];
		}
	}
};