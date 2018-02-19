# -*- coding: utf-8 -*-
# Copyright (c) 2018, Yefri Tavarez and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

from frappe.utils import cint, cstr, flt

class OrdendeProduccion(Document):
	def autoname(self):
		array_name = self.project.split("-")
		self.name = "OP-{}".format(array_name[1])

	def update_project_info(self):
		from costing.printer import get_printer_pieces_assembled
		if not self.project: return

		project = frappe.get_doc("Proyecto", self.project)

		if not project.item: return

		if not frappe.db.exists("Ensamblador de Productos", project.item):
			frappe.throw("""No se encontro un Ensamblador asociado con el SKU usado en el proyecto.<br>
				Es posible que se haya usado un SKU que no es manufacturado por la empresa o que se haya<br>
				borrado el Ensamblador de Productos relacionado con el SKU""")

		sku = frappe.get_doc("Ensamblador de Productos", project.item)
		max_value, best_dimension = get_printer_pieces_assembled(sku.name, sku.materials, sku.dimension)

		self.update({
			"qty": flt(project.production_qty),
			"sku": project.item,
			"project_notes": project.notes,
			"product_type": sku.perfilador_de_productos,
			"project_type": project.project_type,
			"customer": project.customer,
			"customer_name": frappe.get_value("Customer", project.customer, "customer_name"),
			"material": sku.materials,
			"material_name": sku.materials_title,
			"final_dimension": sku.dimension,
			"proceso_tiro": sku.cantidad_tiro_proceso,
			"pantone_tiro": sku.cantidad_tiro_pantone,
			"proceso_retiro": sku.cantidad_proceso_retiro,
			"pantone_retiro": sku.cantidad_pantone_retiro,
			"mounted_pieces": max_value,
			"printing_pieces": max_value,
			"purchase_material_dimension": best_dimension.name,
		})

		self.setup_and_add_operations(sku, project)

	def printing_dimension_change(self):
		from costing.printer import get_total_mounted_pieces_for_printer_the_best_option

		project_item = frappe.get_value("Proyecto", self.project, "item")
		sku_doc = frappe.get_doc("Ensamblador de Productos", project_item)
		final_dimension_doc = frappe.get_doc("Dimensiones", self.final_dimension)
		printing_dimension_doc = frappe.get_doc("Dimensiones", self.printing_dimension)

		opts = {
			"width": printing_dimension_doc.width,
			"height": printing_dimension_doc.height,
			"final_width": final_dimension_doc.width,
			"final_height": final_dimension_doc.width,
			"margin_width": sku_doc.margin_width,
			"margin_height": sku_doc.margin_height
		}
	
		best_value, scrap = get_total_mounted_pieces_for_printer_the_best_option(opts)
		
		self.update({
			"printing_pieces": best_value,
			"mounted_pieces": best_value
		})

	def setup_and_add_operations(self, sku, project):
		conf = frappe.get_single("Configuracion General")

		self.set("pre_operation", conf.pre_operation)
		self.set("pre_in_qty", flt(self.qty))
		
		self.set("print_operation", conf.print_operation)
		self.set("print_in_qty", flt(self.qty))

		self.set("cutter_operation", conf.precut_operation)
		self.set("qty_into_paper_cutter", flt(self.qty))

		if sku.opciones_de_control:
			self.set("options_control_operation", sku.opciones_de_control)
			self.set("options_control_in_qty", flt(self.qty))

		if sku.opciones_de_corte:
			self.set("options_cutter_operation", sku.opciones_de_corte)
			self.set("options_cutter_in_qty", flt(self.qty))

		if sku.opciones_de_empalme:
			self.set("options_union_operation", sku.opciones_de_empalme)
			self.set("options_union_in_qty", flt(self.qty))

		if sku.opciones_de_plegado:
			self.set("options_folding_operation", sku.opciones_de_plegado)
			self.set("options_folding_in_qty", flt(self.qty))
			
		if len(sku.opciones_de_proteccion):
			if len(sku.opciones_de_proteccion) >= 1:
				self.update_opciones_de_proteccion_1(sku)

			if len(sku.opciones_de_proteccion) >= 2:
				self.update_opciones_de_proteccion_2(sku)

		if len(sku.opciones_de_utilidad):
			if len(sku.opciones_de_utilidad) >= 1:
				self.update_opciones_de_utilidad_1(sku)
				
			if len(sku.opciones_de_utilidad) >= 2:
				self.update_opciones_de_utilidad_2(sku)
			
			if len(sku.opciones_de_utilidad) >= 3:
				self.update_opciones_de_utilidad_3(sku)

		if len(sku.opciones_de_textura):
			if len(sku.opciones_de_textura) >= 1:
				self.update_opciones_de_textura_1(sku)
				
			if len(sku.opciones_de_textura) >= 2:
				self.update_opciones_de_textura_2(sku)
		
		self.set("options_packing_operation", conf.packing_operation)
		self.set("options_packing_in_qty", flt(self.qty))

	def update_opciones_de_proteccion_1(self, sku):
		self.set("options_protection_operation_1", sku.opciones_de_proteccion[0].opciones_de_proteccion)
		self.set("options_protection_in_qty_1", flt(self.qty))
		
	def update_opciones_de_proteccion_2(self, sku):
		self.set("options_protection_operation_2", sku.opciones_de_proteccion[1].opciones_de_proteccion)
		self.set("options_protection_in_qty_2", flt(self.qty))

	def update_opciones_de_utilidad_1(self, sku):
		self.set("options_utility_operation_1", sku.opciones_de_utilidad[0].opciones_de_utilidad)
		self.set("options_utility_in_qty_1", flt(self.qty))

	def update_opciones_de_utilidad_2(self, sku):
		self.set("options_utility_operation_2", sku.opciones_de_utilidad[1].opciones_de_utilidad)
		self.set("options_utility_in_qty_2", flt(self.qty))

	def update_opciones_de_utilidad_3(self, sku):
		self.set("options_utility_operation_3", sku.opciones_de_utilidad[2].opciones_de_utilidad)
		self.set("options_utility_in_qty_3", flt(self.qty))

	def update_opciones_de_textura_1(self, sku):
		self.set("options_texture_operation_1", sku.opciones_de_textura[0].opciones_de_textura)
		self.set("options_texture_in_qty_1", flt(self.qty))

	def update_opciones_de_textura_2(self, sku):
		self.set("options_texture_operation_2", sku.opciones_de_textura[1].opciones_de_textura)
		self.set("options_texture_in_qty_2", flt(self.qty))

def get_query_production_order_operation(doctype, txt, searchfield, start, page_len, filters):
	return frappe.db.sql("""
		SELECT
			pre_operation,
			print_operation,
			cutter_operation,
			options_control_operation,
			options_cutter_operation,
			options_union_operation,
			options_folding_operation,
			options_protection_operation_1,
			options_protection_operation_2,
			options_utility_operation_1,
			options_utility_operation_2,
			options_utility_operation_3,
			options_texture_operation_1,
			options_texture_operation_2,
			options_packing_operation
		FROM 
			`tabOrden de Produccion`
		WHERE 
			name = '%s'
	""" % filters.get("production_order"), as_list=True)
	
def get_query_production_order_station(doctype, txt, searchfield, start, page_len, filters):
	stations = frappe.db.sql("""
		SELECT
			pre_station,
			printer_station,
			cutter_station,
			options_control_station,
			options_cutter_station,
			options_union_station,
			options_folding_station,
			options_protection_station_1,
			options_protection_station_2,
			options_utility_station_1,
			options_utility_station_2,
			options_utility_station_3,
			options_texture_station_1,
			options_texture_station_2,
			options_packing_station
		FROM
			`tabOrden de Produccion`
		WHERE
			name = '%s'
	""" % filters.get("production_order"), as_list=True)
	
	station_names = frappe.db.sql("""
		SELECT
			pre_station_name,
			printer_station_name,
			cutter_station_name,
			options_control_station_name,
			options_cutter_station_name,
			options_union_station_name,
			options_folding_station_name,
			options_protection_station_name_1,
			options_protection_station_name_2,
			options_utility_station_name_1,
			options_utility_station_name_2,
			options_utility_station_name_3,
			options_texture_station_name_1,
			options_texture_station_name_2,
			options_packing_station_name
		FROM
			`tabOrden de Produccion`
		WHERE
			name = '%s'
	""" % filters.get("production_order"), as_list=True)

	if not stations:
		stations = []
		station_names = []
	else:
		stations = stations[0]
		station_names = station_names[0]

	return remove_duplicates([[stations[index], station_names[index]] for index in range(0, len(stations)) if stations[index]])

def remove_duplicates(array):
	new_array = []
	for d in array:
		if not d in new_array:
			new_array.append(d)

	return new_array
