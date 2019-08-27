// Copyright (c) 2018, Yefri Tavarez and contributors
// For license information, please see license.txt
(() => {
    const init = {
        toggle_display: (frm, parentfield, fieldname, condition) => {

            const [conditional, value] = condition;
            const cond = `${frm.doc[parentfield]} ${conditional} ${value}`;

            frm.toggle_display(fieldname, eval(cond));
        },
    };

    frappe.ui.form.on("Orden de Produccion", {
        "setup": frm => {
            jQuery.map(["set_queries", "add_fetchs"],
                value => frm.triggervalue);
        },
        "refresh": frm => {
            if (!frm.is_new()) {
                jQuery.map(["refresh_section_labels"],
                    event => frm.trigger(event));
            } else {
                jQuery.map(["update_hard_sheets_qty", "clear_empty_integer_fields"],
                    event => frm.trigger(event));
            }

            frm.trigger("show_hide_color_fields");
        },
        "onload": frm => {
            if (!frm.doc.project && frm.is_new()) {
                frm.page.body.hide();
            } else {
                frm.page.body.show();
            }
        },
        "onload_post_render": frm => {
            if (!frm.doc.project && frm.is_new()) {
                frm.trigger("setup_and_show_prompt");
            }
        },
        "refresh_section_labels": frm => {
            if (!frm.doc.options_protection_operation_2) {
                frm.fields_dict.protection_sb_1.wrapper
                    .find(".form-section-heading.uppercase")
                    .text("TIPO DE PROTECCION");
            }

            if (!frm.doc.options_utility_operation_2) {
                frm.fields_dict.utility_sb_1.wrapper
                    .find(".form-section-heading.uppercase")
                    .text("TIPO DE UTILIDAD");
            }

            if (!frm.doc.options_texture_operation_2) {
                frm.fields_dict.texture_sb_1.wrapper
                    .find(".form-section-heading.uppercase")
                    .text("TIPO DE TEXTURA");
            }
        },
        "show_hide_color_fields": frm => {
            frappe.run_serially([
                frm.trigger("hide_fields_based_on_proceso_tiro"),
                frm.trigger("hide_fields_based_on_pantone_tiro"),
                frm.trigger("hide_fields_based_on_proceso_retiro"),
                frm.trigger("hide_fields_based_on_pantone_retiro"),
            ]);
        },
        "setup_and_show_prompt": frm => {
            let fields = [{
                "fieldname": "project",
                "fieldtype": "Link",
                "label": "Proyecto",
                "options": "Proyecto",
                "reqd": true,
                "onchange": (event) => {
                    if (prompt.get_value("project")) {
                        frappe.db.get_value("Proyecto", prompt.get_value("project"), "project_name", (data) => {
                            frappe.run_serially([
                                () => prompt.set_value("project_name", data.project_name),
                                () => frappe.timeout(1.5),
                                () => {
                                    const primary_btn = prompt.get_primary_btn();
                                    primary_btn.click();
                                }
                            ]);
                        });
                    }
                },
                "get_query": () => {
                    return {
                        "filters": {
                            "status": "Open"
                        }
                    };
                }
            }, {
                "fieldname": "project_name",
                "fieldtype": "Data",
                "label": "Nombre del Proyecto",
                "options": "project.project_name",
                "read_only": true
            }];

            let oncomplete = (form) => {
                frm.set_value("project", form.project);
                frm.set_value("project_name", form.project_name);
                // frm.set_value("packing_dimension", frm.doc.final_dimension);
            };

            let prompt = frappe.prompt(fields, oncomplete, "Seleccion de Proyecto", "Continuar");

            jQuery.extend(prompt, {
                "onhide": () => {
                    frappe.run_serially([
                        () => frappe.timeout(1),
                        () => {
                            if (frm.doc.project) {
                                frm.page.body.show();
                            } else {
                                prompt.show();
                                frm.page.body.hide();
                            }
                        }
                    ]);
                }
            });
        },
        "add_fetchs": frm => {
            jQuery.map([{
                "link_field": "customer",
                "source_field": "customer_name",
                "target_field": "customer_name"
            }, ], value => frm.add_fetch(value.source_field, value.source_field, value.target_field));
        },
        "project": frm => {
            if (frm.doc.project) {
                frm.call("update_project_info")
                    .done(response => {
                        frappe.run_serially([
                            () => frm.refresh_fields(),
                            () => frm.trigger("refresh_section_labels"),
                            () => frm.trigger("clear_empty_integer_fields"),
                            () => frm.trigger("update_start_dates"),
                            () => frm.call("update_colors"),
                            () => frm.trigger("show_hide_color_fields"),
                            () => frm.refresh_fields(),
                        ]);
                    });
            }
        },
        "clear_empty_integer_fields": frm => {
            if (!frm.doc.hard_sheets_qty) {
                frm.set_value("hard_sheets_qty", undefined);
            }

            if (!frm.doc.printing_pieces) {
                frm.set_value("printing_pieces", undefined);
            }

            if (!frm.doc.mounted_pieces) {
                frm.set_value("mounted_pieces", undefined);
            }
        },
        "printing_dimension": frm => {
            if (frm.doc.printing_dimension) {
                frm.call("printing_dimension_change")
                    .then(response => {
                        frm.refresh_fields();
                    });
            }
        },
        "set_queries": frm => {
            frm.set_query("project", () => {
                return {
                    "filters": {
                        "status": "Open"
                    }
                };
            });

            frm.set_query("purchase_material_dimension", () => {
                return {
                    "query": "costing.queries.material_dimension_query",
                    "filters": {
                        "material": frm.doc.material
                    }
                };
            });

            jQuery.map([{
                    "fieldname": "pre_station",
                    "workstation_type": "Preparacion"
                },
                {
                    "fieldname": "printer_station",
                    "workstation_type": "Prensa"
                },
                {
                    "fieldname": "cutter_station",
                    "workstation_type": "Corte"
                },
                {
                    "fieldname": "options_control_station",
                    "workstation_type": "Control"
                },
                {
                    "fieldname": "options_protection_station_1",
                    "workstation_type": "Proteccion"
                },
                {
                    "fieldname": "options_protection_station_2",
                    "workstation_type": "Proteccion"
                },
                {
                    "fieldname": "options_cutter_station",
                    "workstation_type": "Corte"
                },
                {
                    "fieldname": "options_union_station",
                    "workstation_type": "Empalme"
                },
                {
                    "fieldname": "options_packing_station",
                    "workstation_type": "Empaque"
                },
                {
                    "fieldname": "options_folding_station",
                    "workstation_type": "Plegado"
                },
                {
                    "fieldname": "options_utility_station_1",
                    "workstation_type": "Utilidad"
                },
                {
                    "fieldname": "options_utility_station_2",
                    "workstation_type": "Utilidad"
                },
                {
                    "fieldname": "options_utility_station_3",
                    "workstation_type": "Utilidad"
                },
                {
                    "fieldname": "options_texture_station_1",
                    "workstation_type": "Textura"
                },
                {
                    "fieldname": "options_texture_station_2",
                    "workstation_type": "Textura"
                }
            ], value => frappe.set_workstation_query(frm, value));
        },
        "pre_station": frm => {
            if (!frm.doc.pre_station) {
                return 0; // exit code is zero
            }

            let opts = {
                "method": "frappe.client.get_value"
            };

            opts.args = {
                "doctype": "Workstation",
                "filters": frm.doc.pre_station,
                "fieldname": ["hour_rate", "processed_qty_per_hour"]
            };

            frappe.call(opts).done(response => {
                let operating_costs = response.message;
                frm.set_value("options_pre_hour_rate", operating_costs.hour_rate);
                frm.doc.processed_qty_per_hour = operating_costs.processed_qty_per_hour;
                frm.trigger("update_pre_station_costs");
                frm.trigger("update_pre_times");
            });
        },
        "printer_station": frm => {
            if (!frm.doc.printer_station) {
                return 0; // exit code is zero
            }

            let opts = {
                "method": "frappe.client.get_value"
            };

            opts.args = {
                "doctype": "Workstation",
                "filters": frm.doc.printer_station,
                "fieldname": ["hour_rate", "processed_qty_per_hour"]
            };

            frappe.call(opts).done(response => {
                let operating_costs = response.message;
                frm.set_value("options_print_hour_rate", operating_costs.hour_rate);
                frm.doc.processed_qty_per_hour = operating_costs.processed_qty_per_hour;
                frm.trigger("update_printer_station_costs");
                frm.trigger("update_printer_times");
            });
        },
        "cutter_station": frm => {
            if (!frm.doc.cutter_station) {
                return 0; // exit code is zero
            }

            let opts = {
                "method": "frappe.client.get_value"
            };

            opts.args = {
                "doctype": "Workstation",
                "filters": frm.doc.cutter_station,
                "fieldname": ["hour_rate", "processed_qty_per_hour"]
            };

            frappe.call(opts).done(response => {
                let operating_costs = response.message;
                frm.set_value("cutter_hour_rate", operating_costs.hour_rate);
                frm.doc.processed_qty_per_hour = operating_costs.processed_qty_per_hour;
                frm.trigger("update_cutter_station_costs");
                frm.trigger("update_cutter_times");
            });
        },
        "options_control_station": frm => {
            if (!frm.doc.options_control_station) {
                return 0; // exit code is zero
            }

            let opts = {
                "method": "frappe.client.get_value"
            };

            opts.args = {
                "doctype": "Workstation",
                "filters": frm.doc.options_control_station,
                "fieldname": ["hour_rate", "processed_qty_per_hour"]
            };

            frappe.call(opts).done(response => {
                let operating_costs = response.message;
                frm.set_value("options_control_hour_rate", operating_costs.hour_rate);
                frm.doc.processed_qty_per_hour = operating_costs.processed_qty_per_hour;
                frm.trigger("update_options_control_station_costs");
                frm.trigger("update_options_control_times");
            });
        },
        "options_protection_station_1": frm => {
            if (!frm.doc.options_protection_station_1) {
                return 0; // exit code is zero
            }

            let opts = {
                "method": "frappe.client.get_value"
            };

            opts.args = {
                "doctype": "Workstation",
                "filters": frm.doc.options_protection_station_1,
                "fieldname": ["hour_rate", "processed_qty_per_hour"]
            };

            frappe.call(opts).done(response => {
                let operating_costs = response.message;
                frm.set_value("options_protection_hour_rate_1", operating_costs.hour_rate);
                frm.doc.processed_qty_per_hour = operating_costs.processed_qty_per_hour;
                frm.trigger("update_options_protection_station_1_costs");
                frm.trigger("update_options_protection_1_times");
            });
        },
        "options_protection_station_2": frm => {
            if (!frm.doc.options_protection_station_2) {
                return 0; // exit code is zero
            }

            let opts = {
                "method": "frappe.client.get_value"
            };

            opts.args = {
                "doctype": "Workstation",
                "filters": frm.doc.options_protection_station_2,
                "fieldname": ["hour_rate", "processed_qty_per_hour"]
            };

            frappe.call(opts).done(response => {
                let operating_costs = response.message;
                frm.set_value("options_protection_hour_rate_2", operating_costs.hour_rate);
                frm.doc.processed_qty_per_hour = operating_costs.processed_qty_per_hour;
                frm.trigger("update_options_protection_station_2_costs");
                frm.trigger("update_options_protection_2_times");
            });
        },
        "options_cutter_station": frm => {
            if (!frm.doc.options_cutter_station) {
                return 0; // exit code is zero
            }

            let opts = {
                "method": "frappe.client.get_value"
            };

            opts.args = {
                "doctype": "Workstation",
                "filters": frm.doc.options_cutter_station,
                "fieldname": ["hour_rate", "processed_qty_per_hour"]
            };

            frappe.call(opts).done(response => {
                let operating_costs = response.message;
                frm.set_value("options_cutter_hour_rate", operating_costs.hour_rate);
                frm.doc.processed_qty_per_hour = operating_costs.processed_qty_per_hour;
                frm.trigger("update_options_cutter_station_costs");
                frm.trigger("update_options_cutter_times");
            });
        },
        "options_union_station": frm => {
            if (!frm.doc.options_union_station) {
                return 0; // exit code is zero
            }

            let opts = {
                "method": "frappe.client.get_value"
            };

            opts.args = {
                "doctype": "Workstation",
                "filters": frm.doc.options_union_station,
                "fieldname": ["hour_rate", "processed_qty_per_hour"]
            };

            frappe.call(opts).done(response => {
                let operating_costs = response.message;
                frm.set_value("options_union_hour_rate", operating_costs.hour_rate);
                frm.doc.processed_qty_per_hour = operating_costs.processed_qty_per_hour;
                frm.trigger("update_options_union_station_costs");
                frm.trigger("update_options_union_times");
            });
        },
        "options_folding_station": frm => {
            if (!frm.doc.options_folding_station) {
                return 0; // exit code is zero
            }

            let opts = {
                "method": "frappe.client.get_value"
            };

            opts.args = {
                "doctype": "Workstation",
                "filters": frm.doc.options_folding_station,
                "fieldname": ["hour_rate", "processed_qty_per_hour"]
            };

            frappe.call(opts).done(response => {
                let operating_costs = response.message;
                frm.set_value("options_folding_hour_rate_1", operating_costs.hour_rate);
                frm.doc.processed_qty_per_hour = operating_costs.processed_qty_per_hour;
                frm.trigger("update_options_folding_station_costs");
                frm.trigger("update_options_folding_times");
            });
        },
        "options_utility_station_1": frm => {
            if (!frm.doc.options_utility_station_1) {
                return 0; // exit code is zero
            }

            let opts = {
                "method": "frappe.client.get_value"
            };

            opts.args = {
                "doctype": "Workstation",
                "filters": frm.doc.options_utility_station_1,
                "fieldname": ["hour_rate", "processed_qty_per_hour"]
            };

            frappe.call(opts).done(response => {
                let operating_costs = response.message;
                frm.set_value("options_utility_hour_rate_2", operating_costs.hour_rate);
                frm.doc.processed_qty_per_hour = operating_costs.processed_qty_per_hour;
                frm.trigger("update_options_utility_station_1_costs");
                frm.trigger("update_options_utility_1_times");
            });
        },
        "options_utility_station_2": frm => {
            if (!frm.doc.options_utility_station_2) {
                return 0; // exit code is zero
            }

            let opts = {
                "method": "frappe.client.get_value"
            };

            opts.args = {
                "doctype": "Workstation",
                "filters": frm.doc.options_utility_station_2,
                "fieldname": ["hour_rate", "processed_qty_per_hour"]
            };

            frappe.call(opts).done(response => {
                let operating_costs = response.message;
                frm.set_value("options_utility_hour_rate_3", operating_costs.hour_rate);
                frm.doc.processed_qty_per_hour = operating_costs.processed_qty_per_hour;
                frm.trigger("update_options_utility_station_2_costs");
                frm.trigger("update_options_utility_2_times");
            });
        },
        "options_utility_station_3": frm => {
            if (!frm.doc.options_utility_station_3) {
                return 0; // exit code is zero
            }

            let opts = {
                "method": "frappe.client.get_value"
            };

            opts.args = {
                "doctype": "Workstation",
                "filters": frm.doc.options_utility_station_3,
                "fieldname": ["hour_rate", "processed_qty_per_hour"]
            };

            frappe.call(opts).done(response => {
                let operating_costs = response.message;
                frm.set_value("options_utility_hour_rate_1", operating_costs.hour_rate);
                frm.doc.processed_qty_per_hour = operating_costs.processed_qty_per_hour;
                frm.trigger("update_options_utility_station_3_costs");
                frm.trigger("update_options_utility_3_times");
            });
        },
        "options_texture_station_1": frm => {
            if (!frm.doc.options_texture_station_1) {
                return 0; // exit code is zero
            }

            let opts = {
                "method": "frappe.client.get_value"
            };

            opts.args = {
                "doctype": "Workstation",
                "filters": frm.doc.options_texture_station_1,
                "fieldname": ["hour_rate", "processed_qty_per_hour"]
            };

            frappe.call(opts).done(response => {
                let operating_costs = response.message;
                frm.set_value("options_texture_hour_rate_1", operating_costs.hour_rate);
                frm.doc.processed_qty_per_hour = operating_costs.processed_qty_per_hour;
                frm.trigger("update_options_texture_station_1_costs");
                frm.trigger("update_options_texture_1_times");
            });
        },
        "options_texture_station_2": frm => {
            if (!frm.doc.options_texture_station_2) {
                return 0; // exit code is zero
            }

            let opts = {
                "method": "frappe.client.get_value"
            };

            opts.args = {
                "doctype": "Workstation",
                "filters": frm.doc.options_texture_station_2,
                "fieldname": ["hour_rate", "processed_qty_per_hour"]
            };

            frappe.call(opts).done(response => {
                let operating_costs = response.message;
                frm.set_value("options_texture_hour_rate_2", operating_costs.hour_rate);
                frm.doc.processed_qty_per_hour = operating_costs.processed_qty_per_hour;
                frm.trigger("update_options_texture_station_2_costs");
                frm.trigger("update_options_texture_2_times");
            });
        },
        "options_packing_station": frm => {
            if (!frm.doc.options_packing_station) {
                return 0; // exit code is zero
            }

            let opts = {
                "method": "frappe.client.get_value"
            };

            opts.args = {
                "doctype": "Workstation",
                "filters": frm.doc.options_packing_station,
                "fieldname": ["hour_rate", "processed_qty_per_hour"]
            };

            frappe.call(opts).done(response => {
                let operating_costs = response.message;
                frm.set_value("options_packing_hour_rate", operating_costs.hour_rate);
                frm.doc.processed_qty_per_hour = operating_costs.processed_qty_per_hour;
                frm.trigger("update_options_packing_station_costs");
                frm.trigger("update_options_packing_times");
            });
        },
        "update_pre_station_costs": frm => {
            let processed_qty_per_minute = flt(frm.doc.processed_qty_per_hour) / flt(60.000);
            let minute_rate = flt(frm.doc.options_pre_hour_rate) / flt(60.000);
            let time_in_minutes = flt(frm.doc.pre_in_qty) / processed_qty_per_minute;

            frm.set_value("options_pre_expected_total_cost", time_in_minutes * minute_rate);
            frm.set_value("pre_time_in_minutes", time_in_minutes);
        },
        "update_printer_station_costs": frm => {
            let processed_qty_per_minute = flt(frm.doc.processed_qty_per_hour) / flt(60.000);
            let minute_rate = flt(frm.doc.options_print_hour_rate) / flt(60.000);
            let time_in_minutes = flt(frm.doc.print_in_qty) / processed_qty_per_minute;

            frm.set_value("options_print_expected_total_cost", time_in_minutes * minute_rate);
            frm.set_value("print_time_in_minutes", time_in_minutes);
        },
        "update_cutter_station_costs": frm => {
            let processed_qty_per_minute = flt(frm.doc.processed_qty_per_hour) / flt(60.000);
            let minute_rate = flt(frm.doc.cutter_hour_rate) / flt(60.000);
            let time_in_minutes = flt(frm.doc.qty_into_paper_cutter) / processed_qty_per_minute;

            frm.set_value("cutter_expected_total_cost", time_in_minutes * minute_rate);
            frm.set_value("cutter_expected_time_in_minutes", time_in_minutes);
        },
        "update_options_control_station_costs": frm => {
            let processed_qty_per_minute = flt(frm.doc.processed_qty_per_hour) / flt(60.000);
            let minute_rate = flt(frm.doc.options_control_hour_rate) / flt(60.000);
            let time_in_minutes = flt(frm.doc.options_control_in_qty) / processed_qty_per_minute;

            frm.set_value("options_control_expected_total_cost", time_in_minutes * minute_rate);
            frm.set_value("options_control_expected_time_in_minutes", time_in_minutes);
        },
        "update_options_protection_station_1_costs": frm => {
            let processed_qty_per_minute = flt(frm.doc.processed_qty_per_hour) / flt(60.000);
            let minute_rate = flt(frm.doc.options_protection_hour_rate_1) / flt(60.000);
            let time_in_minutes = flt(frm.doc.options_protection_in_qty_1) / processed_qty_per_minute;

            frm.set_value("options_protection_expected_total_cost_1", time_in_minutes * minute_rate);
            frm.set_value("options_protection_expected_time_in_minutes_1", time_in_minutes);
        },
        "update_options_protection_station_2_costs": frm => {
            let processed_qty_per_minute = flt(frm.doc.processed_qty_per_hour) / flt(60.000);
            let minute_rate = flt(frm.doc.options_protection_hour_rate_2) / flt(60.000);
            let time_in_minutes = flt(frm.doc.options_protection_in_qty_2) / processed_qty_per_minute;

            frm.set_value("options_protection_expected_total_cost_2", time_in_minutes * minute_rate);
            frm.set_value("options_protection_expected_time_in_minutes_2", time_in_minutes);
        },
        "update_options_cutter_station_costs": frm => {
            let processed_qty_per_minute = flt(frm.doc.processed_qty_per_hour) / flt(60.000);
            let minute_rate = flt(frm.doc.options_cutter_hour_rate) / flt(60.000);
            let time_in_minutes = flt(frm.doc.options_cutter_in_qty) / processed_qty_per_minute;

            frm.set_value("options_cutter_expected_total_cost", time_in_minutes * minute_rate);
            frm.set_value("options_cutter_expected_time_in_minutes", time_in_minutes);
        },
        "update_options_union_station_costs": frm => {
            let processed_qty_per_minute = flt(frm.doc.processed_qty_per_hour) / flt(60.000);
            let minute_rate = flt(frm.doc.options_union_hour_rate) / flt(60.000);
            let time_in_minutes = flt(frm.doc.options_union_in_qty) / processed_qty_per_minute;

            frm.set_value("options_union_expected_total_cost", time_in_minutes * minute_rate);
            frm.set_value("options_union_expected_time_in_minutes", time_in_minutes);
        },
        "update_options_folding_station_costs": frm => {
            let processed_qty_per_minute = flt(frm.doc.processed_qty_per_hour) / flt(60.000);
            let minute_rate = flt(frm.doc.options_folding_hour_rate) / flt(60.000);
            let time_in_minutes = flt(frm.doc.options_folding_in_qty) / processed_qty_per_minute;

            frm.set_value("options_folding_expected_total_cost", time_in_minutes * minute_rate);
            frm.set_value("options_folding_expected_time_in_minutes", time_in_minutes);
        },
        "update_options_utility_station_1_costs": frm => {
            let processed_qty_per_minute = flt(frm.doc.processed_qty_per_hour) / flt(60.000);
            let minute_rate = flt(frm.doc.options_utility_hour_rate_1) / flt(60.000);
            let time_in_minutes = flt(frm.doc.options_utility_in_qty_1) / processed_qty_per_minute;

            frm.set_value("options_utility_expected_total_cost_1", time_in_minutes * minute_rate);
            frm.set_value("options_utility_expected_time_in_minutes_1", time_in_minutes);
        },
        "update_options_utility_station_2_costs": frm => {
            let processed_qty_per_minute = flt(frm.doc.processed_qty_per_hour) / flt(60.000);
            let minute_rate = flt(frm.doc.options_utility_hour_rate_2) / flt(60.000);
            let time_in_minutes = flt(frm.doc.options_utility_in_qty_2) / processed_qty_per_minute;

            frm.set_value("options_utility_expected_total_cost_2", time_in_minutes * minute_rate);
            frm.set_value("options_utility_expected_time_in_minutes_2", time_in_minutes);
        },
        "update_options_utility_station_3_costs": frm => {
            let processed_qty_per_minute = flt(frm.doc.processed_qty_per_hour) / flt(60.000);
            let minute_rate = flt(frm.doc.options_utility_hour_rate_3) / flt(60.000);
            let time_in_minutes = flt(frm.doc.options_utility_in_qty_3) / processed_qty_per_minute;

            frm.set_value("options_utility_expected_total_cost_3", time_in_minutes * minute_rate);
            frm.set_value("options_utility_expected_time_in_minutes_3", time_in_minutes);
        },
        "update_options_texture_station_1_costs": frm => {
            let processed_qty_per_minute = flt(frm.doc.processed_qty_per_hour) / flt(60.000);
            let minute_rate = flt(frm.doc.options_texture_hour_rate_1) / flt(60.000);
            let time_in_minutes = flt(frm.doc.options_texture_in_qty_1) / processed_qty_per_minute;

            frm.set_value("options_texture_expected_total_cost_1", time_in_minutes * minute_rate);
            frm.set_value("options_texture_expected_time_in_minutes_1", time_in_minutes);
        },
        "update_options_texture_station_2_costs": frm => {
            let processed_qty_per_minute = flt(frm.doc.processed_qty_per_hour) / flt(60.000);
            let minute_rate = flt(frm.doc.options_texture_hour_rate_2) / flt(60.000);
            let time_in_minutes = flt(frm.doc.options_texture_in_qty_2) / processed_qty_per_minute;

            frm.set_value("options_texture_expected_total_cost_2", time_in_minutes * minute_rate);
            frm.set_value("options_texture_expected_time_in_minutes_2", time_in_minutes);
        },
        "update_options_packing_station_costs": frm => {
            let processed_qty_per_minute = flt(frm.doc.processed_qty_per_hour) / flt(60.000);
            let minute_rate = flt(frm.doc.options_packing_hour_rate) / flt(60.000);
            let time_in_minutes = flt(frm.doc.options_packing_in_qty) / processed_qty_per_minute;

            frm.set_value("options_packing_expected_total_cost", time_in_minutes * minute_rate);
            frm.set_value("options_packing_expected_time_in_minutes", time_in_minutes);
        },
        "update_start_dates": frm => {
            let general_conf = frappe.boot.general_conf;

            let fmt = "YYYY-MM-DD HH:mm:ss";

            let expected_start_date = frappe.datetime
                .get_next_working_date(frm.doc.expected_start_date);

            let moment_js = moment(expected_start_date, fmt);

            if (expected_start_date == frm.doc.expected_start_date) {
                moment_js.add(general_conf.time_frame, general_conf.time_frame_unit);
            }

            frm.set_value("pre_expected_start_time", moment_js.format(fmt));
        },
        "pre_in_qty": frm => {
            frm.trigger("pre_station")
        },
        "print_in_qty": frm => {
            frm.trigger("printer_station")
        },
        "qty_into_paper_cutter": frm => {
            frm.trigger("cutter_station")
        },
        "options_control_in_qty": frm => {
            frm.trigger("options_control_station")
        },
        "options_protection_in_qty_1": frm => {
            frm.trigger("options_protection_station_1")
        },
        "options_protection_in_qty_2": frm => {
            frm.trigger("options_protection_station_2")
        },
        "options_cutter_in_qty": frm => {
            frm.trigger("options_cutter_station")
        },
        "options_union_in_qty": frm => {
            frm.trigger("options_union_station")
        },
        "options_folding_in_qty": frm => {
            frm.trigger("options_folding_station")
        },
        "options_utility_in_qty_1": frm => {
            frm.trigger("options_utility_station_1")
        },
        "options_utility_in_qty_2": frm => {
            frm.trigger("options_utility_station_2")
        },
        "options_utility_in_qty_3": frm => {
            frm.trigger("options_utility_station_3")
        },
        "options_texture_in_qty_1": frm => {
            frm.trigger("options_texture_station_1")
        },
        "options_texture_in_qty_2": frm => {
            frm.trigger("options_texture_station_2")
        },
        "options_packing_in_qty": frm => {
            frm.trigger("options_packing_station")
        },
        "update_pre_times": frm => {
            if (!frm.doc.pre_expected_start_time) {
                return 0; // exit code is zero
            }

            let general_conf = frappe.boot.general_conf;

            let fmt = "YYYY-MM-DD HH:mm:ss";

            let expected_start_date = frappe.datetime
                .get_next_working_date(frm.doc.pre_expected_start_time);

            let moment_js = moment(expected_start_date, fmt);

            if (expected_start_date == frm.doc.pre_expected_start_time) {
                moment_js.add(frm.doc.pre_time_in_minutes, "minutes");
            }

            frm.set_value("pre_expected_end_time", moment_js.format(fmt));
        },
        "update_printer_times": frm => {
            if (!frm.doc.print_expected_end_time) {
                return 0; // exit code is zero
            }

            let general_conf = frappe.boot.general_conf;

            let fmt = "YYYY-MM-DD HH:mm:ss";

            let expected_start_date = frappe.datetime
                .get_next_working_date(frm.doc.print_expected_end_time);

            let moment_js = moment(expected_start_date, fmt);

            if (expected_start_date == frm.doc.print_expected_end_time) {
                moment_js.add(general_conf.time_frame, general_conf.time_frame_unit);
            }

            frm.set_value("print_expected_start_time", moment_js.format(fmt));
        },
        "update_cutter_times": frm => {
            if (!frm.doc.cutter_expected_end_time) {
                return 0; // exit code is zero
            }

            let general_conf = frappe.boot.general_conf;

            let fmt = "YYYY-MM-DD HH:mm:ss";

            let expected_start_date = frappe.datetime
                .get_next_working_date(frm.doc.cutter_expected_end_time);

            let moment_js = moment(expected_start_date, fmt);

            if (expected_start_date == frm.doc.cutter_expected_end_time) {
                moment_js.add(general_conf.time_frame, general_conf.time_frame_unit);
            }

            frm.set_value("cutter_expected_start_time", moment_js.format(fmt));
        },
        "update_options_control_times": frm => {
            if (!frm.doc.options_control_expected_end_time) {
                return 0; // exit code is zero
            }

            let general_conf = frappe.boot.general_conf;

            let fmt = "YYYY-MM-DD HH:mm:ss";

            let expected_start_date = frappe.datetime
                .get_next_working_date(frm.doc.options_control_expected_end_time);

            let moment_js = moment(expected_start_date, fmt);

            if (expected_start_date == frm.doc.options_control_expected_end_time) {
                moment_js.add(general_conf.time_frame, general_conf.time_frame_unit);
            }

            frm.set_value("options_control_expected_start_time", moment_js.format(fmt));
        },
        "update_options_protection_1_times": frm => {
            if (!frm.doc.options_protection_expected_end_time_1) {
                return 0; // exit code is zero
            }

            let general_conf = frappe.boot.general_conf;

            let fmt = "YYYY-MM-DD HH:mm:ss";

            let expected_start_date = frappe.datetime
                .get_next_working_date(frm.doc.options_protection_expected_end_time_1);

            let moment_js = moment(expected_start_date, fmt);

            if (expected_start_date == frm.doc.options_protection_expected_end_time_1) {
                moment_js.add(general_conf.time_frame, general_conf.time_frame_unit);
            }

            frm.set_value("options_protection_expected_start_time_1", moment_js.format(fmt));
        },
        "update_options_protection_2_times": frm => {
            if (!frm.doc.options_protection_expected_end_time_2) {
                return 0; // exit code is zero
            }

            let general_conf = frappe.boot.general_conf;

            let fmt = "YYYY-MM-DD HH:mm:ss";

            let expected_start_date = frappe.datetime
                .get_next_working_date(frm.doc.options_protection_expected_end_time_2);

            let moment_js = moment(expected_start_date, fmt);

            if (expected_start_date == frm.doc.options_protection_expected_end_time_2) {
                moment_js.add(general_conf.time_frame, general_conf.time_frame_unit);
            }

            frm.set_value("options_protection_expected_start_time_2", moment_js.format(fmt));
        },
        "update_options_cutter_times": frm => {
            if (!frm.doc.options_cutter_expected_end_time) {
                return 0; // exit code is zero
            }

            let general_conf = frappe.boot.general_conf;

            let fmt = "YYYY-MM-DD HH:mm:ss";

            let expected_start_date = frappe.datetime
                .get_next_working_date(frm.doc.options_cutter_expected_end_time);

            let moment_js = moment(expected_start_date, fmt);

            if (expected_start_date == frm.doc.options_cutter_expected_end_time) {
                moment_js.add(general_conf.time_frame, general_conf.time_frame_unit);
            }

            frm.set_value("options_cutter_expected_start_time", moment_js.format(fmt));
        },
        "update_options_union_times": frm => {
            if (!frm.doc.options_union_expected_end_time) {
                return 0; // exit code is zero
            }

            let general_conf = frappe.boot.general_conf;

            let fmt = "YYYY-MM-DD HH:mm:ss";

            let expected_start_date = frappe.datetime
                .get_next_working_date(frm.doc.options_union_expected_end_time);

            let moment_js = moment(expected_start_date, fmt);

            if (expected_start_date == frm.doc.options_union_expected_end_time) {
                moment_js.add(general_conf.time_frame, general_conf.time_frame_unit);
            }

            frm.set_value("options_union_expected_start_time", moment_js.format(fmt));
        },
        "update_options_folding_times": frm => {
            if (!frm.doc.options_folding_expected_end_time) {
                return 0; // exit code is zero
            }

            let general_conf = frappe.boot.general_conf;

            let fmt = "YYYY-MM-DD HH:mm:ss";

            let expected_start_date = frappe.datetime
                .get_next_working_date(frm.doc.options_folding_expected_end_time);

            let moment_js = moment(expected_start_date, fmt);

            if (expected_start_date == frm.doc.options_folding_expected_end_time) {
                moment_js.add(general_conf.time_frame, general_conf.time_frame_unit);
            }

            frm.set_value("options_folding_expected_start_time", moment_js.format(fmt));
        },
        "update_options_utility_1_times": frm => {
            if (!frm.doc.options_utility_expected_end_time_1) {
                return 0; // exit code is zero
            }

            let general_conf = frappe.boot.general_conf;

            let fmt = "YYYY-MM-DD HH:mm:ss";

            let expected_start_date = frappe.datetime
                .get_next_working_date(frm.doc.options_utility_expected_end_time_1);

            let moment_js = moment(expected_start_date, fmt);

            if (expected_start_date == frm.doc.options_utility_expected_end_time_1) {
                moment_js.add(general_conf.time_frame, general_conf.time_frame_unit);
            }

            frm.set_value("options_utility_expected_start_time_1", moment_js.format(fmt));
        },
        "update_options_utility_2_times": frm => {
            if (!frm.doc.options_utility_expected_end_time_2) {
                return 0; // exit code is zero
            }

            let general_conf = frappe.boot.general_conf;

            let fmt = "YYYY-MM-DD HH:mm:ss";

            let expected_start_date = frappe.datetime
                .get_next_working_date(frm.doc.options_utility_expected_end_time_2);

            let moment_js = moment(expected_start_date, fmt);

            if (expected_start_date == frm.doc.options_utility_expected_end_time_2) {
                moment_js.add(general_conf.time_frame, general_conf.time_frame_unit);
            }

            frm.set_value("options_utility_expected_start_time_2", moment_js.format(fmt));
        },
        "update_options_utility_3_times": frm => {
            if (!frm.doc.options_utility_expected_end_time_3) {
                return 0; // exit code is zero
            }

            let general_conf = frappe.boot.general_conf;

            let fmt = "YYYY-MM-DD HH:mm:ss";

            let expected_start_date = frappe.datetime
                .get_next_working_date(frm.doc.options_utility_expected_end_time_3);

            let moment_js = moment(expected_start_date, fmt);

            if (expected_start_date == frm.doc.options_utility_expected_end_time_3) {
                moment_js.add(general_conf.time_frame, general_conf.time_frame_unit);
            }

            frm.set_value("options_utility_expected_start_time_3", moment_js.format(fmt));
        },
        "update_options_texture_1_times": frm => {
            if (!frm.doc.options_texture_expected_end_time_1) {
                return 0; // exit code is zero
            }

            let general_conf = frappe.boot.general_conf;

            let fmt = "YYYY-MM-DD HH:mm:ss";

            let expected_start_date = frappe.datetime
                .get_next_working_date(frm.doc.options_texture_expected_end_time_1);

            let moment_js = moment(expected_start_date, fmt);

            if (expected_start_date == frm.doc.options_texture_expected_end_time_1) {
                moment_js.add(general_conf.time_frame, general_conf.time_frame_unit);
            }

            frm.set_value("options_texture_expected_start_time_1", moment_js.format(fmt));
        },
        "update_options_texture_2_times": frm => {
            if (!frm.doc.options_texture_expected_end_time_2) {
                return 0; // exit code is zero
            }

            let general_conf = frappe.boot.general_conf;

            let fmt = "YYYY-MM-DD HH:mm:ss";

            let expected_start_date = frappe.datetime
                .get_next_working_date(frm.doc.options_texture_expected_end_time_2);

            let moment_js = moment(expected_start_date, fmt);

            if (expected_start_date == frm.doc.options_texture_expected_end_time_2) {
                moment_js.add(general_conf.time_frame, general_conf.time_frame_unit);
            }

            frm.set_value("options_texture_expected_start_time_2", moment_js.format(fmt));
        },
        "update_options_packing_times": frm => {
            if (!frm.doc.options_packing_expected_end_time) {
                return 0; // exit code is zero
            }

            let general_conf = frappe.boot.general_conf;

            let fmt = "YYYY-MM-DD HH:mm:ss";

            let expected_start_date = frappe.datetime
                .get_next_working_date(frm.doc.options_packing_expected_end_time);

            let moment_js = moment(expected_start_date, fmt);

            if (expected_start_date == frm.doc.options_packing_expected_end_time) {
                moment_js.add(general_conf.time_frame, general_conf.time_frame_unit);
            }

            frm.set_value("options_packing_expected_start_time", moment_js.format(fmt));
        },
        // "expected_start_date": frm => {
        //  if (frm.doc.expected_start_date) {
        //      let fmt = "YYYY-MM-DD HH:mm:ss";
        //      let moment_js = moment(frm.doc.expected_start_date, fmt);

        //      let expected_end_time = moment_js.add(frm.doc.time_in_minutes, "minutes").format(fmt);
        //      frm.set_value("expected_end_date", frappe.datetime.get_next_working_date(expected_end_time));
        //  }
        // },
        "pre_expected_end_time": frm => {
            if (frm.doc.pre_expected_start_time) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.pre_expected_start_time, fmt);

                let expected_end_time = moment_js.add(frm.doc.pre_time_in_minutes, "minutes").format(fmt);
                frm.set_value("print_expected_start_time", frappe.datetime.get_next_working_date(expected_end_time));
            }
        },
        "print_expected_end_time": frm => {
            if (frm.doc.print_expected_start_time) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.print_expected_start_time, fmt);

                let expected_end_time = moment_js.add(frm.doc.print_time_in_minutes, "minutes").format(fmt);
                frm.set_value("cutter_expected_start_time", frappe.datetime.get_next_working_date(expected_end_time));
            }
        },
        "cutter_expected_end_time": frm => {
            if (frm.doc.cutter_expected_start_time) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.cutter_expected_start_time, fmt);

                let expected_end_time = moment_js.add(frm.doc.cutter_expected_time_in_minutes, "minutes").format(fmt);
                frm.set_value("options_control_expected_start_time", frappe.datetime.get_next_working_date(expected_end_time));
            }
        },
        "options_control_expected_end_time": frm => {
            if (frm.doc.options_control_expected_start_time) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_control_expected_start_time, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_control_expected_time_in_minutes, "minutes").format(fmt);
                frm.set_value("options_protection_expected_start_time_1", frappe.datetime.get_next_working_date(expected_end_time));
            }
        },
        "options_protection_expected_end_time_1": frm => {
            if (frm.doc.options_protection_expected_start_time_1) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_protection_expected_start_time_1, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_protection_expected_time_in_minutes_1, "minutes").format(fmt);
                frm.set_value("options_protection_expected_start_time_2", frappe.datetime.get_next_working_date(expected_end_time));
            }
        },
        "options_protection_expected_end_time_2": frm => {
            if (frm.doc.options_protection_expected_start_time_2) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_protection_expected_start_time_2, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_protection_expected_time_in_minutes_2, "minutes").format(fmt);
                frm.set_value("options_cutter_expected_start_time", frappe.datetime.get_next_working_date(expected_end_time));
            }
        },
        "options_cutter_expected_end_time": frm => {
            if (frm.doc.options_cutter_expected_start_time) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_cutter_expected_start_time, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_cutter_expected_time_in_minutes, "minutes").format(fmt);
                frm.set_value("options_folding_expected_start_time", frappe.datetime.get_next_working_date(expected_end_time));
            }
        },
        "options_folding_expected_end_time": frm => {
            if (frm.doc.options_folding_expected_start_time) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_folding_expected_start_time, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_folding_expected_time_in_minutes, "minutes").format(fmt);
                frm.set_value("options_union_expected_start_time", frappe.datetime.get_next_working_date(expected_end_time));
            }
        },
        "options_union_expected_end_time": frm => {
            if (frm.doc.options_union_expected_start_time) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_union_expected_start_time, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_union_expected_time_in_minutes, "minutes").format(fmt);
                frm.set_value("options_utility_expected_start_time_1", frappe.datetime.get_next_working_date(expected_end_time));
            }
        },
        "options_utility_expected_end_time_1": frm => {
            if (frm.doc.options_utility_expected_start_time_1) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_utility_expected_start_time_1, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_utility_expected_time_in_minutes_1, "minutes").format(fmt);
                frm.set_value("options_utility_expected_start_time_2", frappe.datetime.get_next_working_date(expected_end_time));
            }
        },
        "options_utility_expected_end_time_2": frm => {
            if (frm.doc.options_utility_expected_start_time_2) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_utility_expected_start_time_2, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_utility_expected_time_in_minutes_2, "minutes").format(fmt);
                frm.set_value("options_utility_expected_start_time_3", frappe.datetime.get_next_working_date(expected_end_time));
            }
        },
        "options_utility_expected_end_time_3": frm => {
            if (frm.doc.options_utility_expected_start_time_3) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_utility_expected_start_time_3, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_utility_expected_time_in_minutes_3, "minutes").format(fmt);
                frm.set_value("options_texture_expected_start_time_1", frappe.datetime.get_next_working_date(expected_end_time));
            }
        },
        "options_texture_expected_end_time_1": frm => {
            if (frm.doc.options_texture_expected_start_time_1) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_texture_expected_start_time_1, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_texture_expected_time_in_minutes_1, "minutes").format(fmt);
                frm.set_value("options_texture_expected_start_time_2", frappe.datetime.get_next_working_date(expected_end_time));
            }
        },
        "options_texture_expected_end_time_2": frm => {
            if (frm.doc.options_texture_expected_start_time_2) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_texture_expected_start_time_2, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_texture_expected_time_in_minutes_2, "minutes").format(fmt);
                frm.set_value("options_packing_expected_start_time", frappe.datetime.get_next_working_date(expected_end_time));
            }
        },
        "options_packing_expected_end_time": frm => {
            if (frm.doc.options_packing_expected_start_time) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_packing_expected_start_time, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_packing_expected_time_in_minutes, "minutes").format(fmt);
                frm.set_value("expected_end_date", frappe.datetime.get_next_working_date(expected_end_time));
            }
        },
        "pre_expected_start_time": frm => {
            if (frm.doc.pre_expected_start_time) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.pre_expected_start_time, fmt);

                let expected_end_time = moment_js.add(frm.doc.pre_time_in_minutes, "minutes");
                frm.set_value("pre_expected_end_time", expected_end_time.format(fmt));
            }
        },
        "print_expected_start_time": frm => {
            if (frm.doc.print_expected_start_time) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.print_expected_start_time, fmt);

                let expected_end_time = moment_js.add(frm.doc.print_time_in_minutes, "minutes");
                frm.set_value("print_expected_end_time", expected_end_time.format(fmt));
            }
        },
        "cutter_expected_start_time": frm => {
            if (frm.doc.cutter_expected_start_time) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.cutter_expected_start_time, fmt);

                let expected_end_time = moment_js.add(frm.doc.cutter_expected_time_in_minutes, "minutes");
                frm.set_value("cutter_expected_end_time", expected_end_time.format(fmt));
            }
        },
        "options_control_expected_start_time": frm => {
            if (frm.doc.options_control_expected_start_time) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_control_expected_start_time, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_control_expected_time_in_minutes, "minutes");
                frm.set_value("options_control_expected_end_time", expected_end_time.format(fmt));
            }
        },
        "options_protection_expected_start_time_1": frm => {
            if (frm.doc.options_protection_expected_start_time_1) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_protection_expected_start_time_1, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_protection_expected_time_in_minutes_1, "minutes");
                frm.set_value("options_protection_expected_end_time_1", expected_end_time.format(fmt));
            }
        },
        "options_protection_expected_start_time_2": frm => {
            if (frm.doc.options_protection_expected_start_time_2) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_protection_expected_start_time_2, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_protection_expected_time_in_minutes_2, "minutes");
                frm.set_value("options_protection_expected_end_time_2", expected_end_time.format(fmt));
            }
        },
        "options_cutter_expected_start_time": frm => {
            if (frm.doc.options_cutter_expected_start_time) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_cutter_expected_start_time, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_cutter_expected_time_in_minutes, "minutes");
                frm.set_value("options_cutter_expected_end_time", expected_end_time.format(fmt));
            }
        },
        "options_union_expected_start_time": frm => {
            if (frm.doc.options_union_expected_start_time) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_union_expected_start_time, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_union_expected_time_in_minutes, "minutes");
                frm.set_value("options_union_expected_end_time", expected_end_time.format(fmt));
            }
        },
        "options_folding_expected_start_time": frm => {
            if (frm.doc.options_folding_expected_start_time) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_folding_expected_start_time, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_folding_expected_time_in_minutes, "minutes");
                frm.set_value("options_folding_expected_end_time", expected_end_time.format(fmt));
            }
        },
        "options_utility_expected_start_time_1": frm => {
            if (frm.doc.options_utility_expected_start_time_1) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_utility_expected_start_time_1, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_utility_expected_time_in_minutes_1, "minutes");
                frm.set_value("options_utility_expected_end_time_1", expected_end_time.format(fmt));
            }
        },
        "options_utility_expected_start_time_2": frm => {
            if (frm.doc.options_utility_expected_start_time_2) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_utility_expected_start_time_2, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_utility_expected_time_in_minutes_2, "minutes");
                frm.set_value("options_utility_expected_end_time_2", expected_end_time.format(fmt));
            }
        },
        "options_utility_expected_start_time_3": frm => {
            if (frm.doc.options_utility_expected_start_time_3) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_utility_expected_start_time_3, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_utility_expected_time_in_minutes_3, "minutes");
                frm.set_value("options_utility_expected_end_time_3", expected_end_time.format(fmt));
            }
        },
        "options_texture_expected_start_time_1": frm => {
            if (frm.doc.options_texture_expected_start_time_1) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_texture_expected_start_time_1, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_texture_expected_time_in_minutes_1, "minutes");
                frm.set_value("options_texture_expected_end_time_1", expected_end_time.format(fmt));
            }
        },
        "options_texture_expected_start_time_2": frm => {
            if (frm.doc.options_texture_expected_start_time_2) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_texture_expected_start_time_2, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_texture_expected_time_in_minutes_2, "minutes");
                frm.set_value("options_texture_expected_end_time_2", expected_end_time.format(fmt));
            }
        },
        "options_packing_expected_start_time": frm => {
            if (frm.doc.options_packing_expected_start_time) {
                let fmt = "YYYY-MM-DD HH:mm:ss";
                let moment_js = moment(frm.doc.options_packing_expected_start_time, fmt);

                let expected_end_time = moment_js.add(frm.doc.options_packing_expected_time_in_minutes, "minutes");
                frm.set_value("options_packing_expected_end_time", expected_end_time.format(fmt));
            }
        },
        "hard_sheets_front_qty": frm => {
            frm.trigger("update_hard_sheets_qty");
        },
        "hard_sheets_back_qty": frm => {
            frm.trigger("update_hard_sheets_qty");
        },
        "update_hard_sheets_qty": frm => {
            let hard_sheets_qty = cint(frm.doc.hard_sheets_front_qty) +
                cint(frm.doc.hard_sheets_back_qty);

            frm.set_value("hard_sheets_qty", hard_sheets_qty);
        },
        proceso_tiro: frm => {
            frm.trigger("hide_fields_based_on_proceso_tiro");
        },
        pantone_tiro: frm => {
            frm.trigger("hide_fields_based_on_pantone_tiro");
        },
        proceso_retiro: frm => {
            frm.trigger("hide_fields_based_on_proceso_retiro");
        },
        pantone_retiro: frm => {
            frm.trigger("hide_fields_based_on_pantone_retiro");
        },
        hide_fields_based_on_proceso_tiro: frm => {
            const fields = {
                "color_proceso_tiro_1": [">=", 1],
                "color_proceso_tiro_2": [">=", 2],
                "color_proceso_tiro_3": [">=", 3],
                "color_proceso_tiro_4": [">=", 4],
            };

            jQuery.each(fields, (fieldname, condition) => {
                init.toggle_display(frm, "proceso_tiro", fieldname, condition);
            });
        },
        hide_fields_based_on_pantone_tiro: frm => {
            const fields = {
                "color_pantone_tiro_1": [">=", 1],
                "color_pantone_tiro_2": [">=", 2],
                "color_pantone_tiro_3": [">=", 3],
                "color_pantone_tiro_4": [">=", 4],
            };

            jQuery.each(fields, (fieldname, condition) => {
                init.toggle_display(frm, "pantone_tiro", fieldname, condition);
            });
        },
        hide_fields_based_on_proceso_retiro: frm => {
            const fields = {
                "color_proceso_retiro_1": [">=", 1],
                "color_proceso_retiro_2": [">=", 2],
                "color_proceso_retiro_3": [">=", 3],
                "color_proceso_retiro_4": [">=", 4],
            };

            jQuery.each(fields, (fieldname, condition) => {
                init.toggle_display(frm, "proceso_retiro", fieldname, condition);
            });
        },
        hide_fields_based_on_pantone_retiro: frm => {
            const fields = {
                "color_pantone_retiro_1": [">=", 1],
                "color_pantone_retiro_2": [">=", 2],
                "color_pantone_retiro_3": [">=", 3],
                "color_pantone_retiro_4": [">=", 4],
            };

            jQuery.each(fields, (fieldname, condition) => {
                init.toggle_display(frm, "pantone_retiro", fieldname, condition);
            });
        },
    });

    jQuery.extend(frappe, {
        "set_workstation_query": (frm, value) => {
            frm.set_query(value.fieldname, () => {
                return {
                    "filters": {
                        "category": value.workstation_type
                    },
                };
            });
        }
    });
})();