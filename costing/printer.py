# -*- coding: utf-8 -*-
# Copyright (c) 2018, Yefri Tavarez and contributors
# For license information, please see license.txt

import frappe

from frappe.utils import cint, cstr, flt


def get_total_mounted_pieces_for_printer_first_option(opts):
    horizontal, vertical, hscrap, vscrap = get_mounted_pieces_for_printer_first_option(
        opts)
    return cint(horizontal) * cint(vertical), hscrap, vscrap


def get_total_mounted_pieces_for_printer_second_option(opts):
    horizontal, vertical, hscrap, vscrap = get_mounted_pieces_for_printer_second_option(
        opts)
    return cint(horizontal) * cint(vertical), hscrap, vscrap


def get_mounted_pieces_for_printer_first_option(opts):
    opts = frappe._dict(opts)

    abstract_horizontal = flt(opts.width) / \
        (flt(opts.final_width) + flt(opts.margin_width))
    abstract_vertical = flt(opts.height) / \
        (flt(opts.final_height) + flt(opts.margin_height))

    horizontal_scrap = get_scrap(abstract_horizontal)
    vertical_scrap = get_scrap(abstract_vertical)

    percentage_vertical_scrap = get_percentage_scrap(
        opts.width, horizontal_scrap)
    percentage_horizontal_scrap = get_percentage_scrap(
        opts.height, vertical_scrap)

    return cint(abstract_horizontal), cint(abstract_vertical), \
        flt(percentage_vertical_scrap), flt(percentage_horizontal_scrap)


def get_mounted_pieces_for_printer_second_option(opts):
    opts = frappe._dict(opts)

    abstract_horizontal = flt(opts.width) / \
        (flt(opts.final_height) + flt(opts.margin_height))
    abstract_vertical = flt(opts.height) / \
        (flt(opts.final_width) + flt(opts.margin_width))

    horizontal_scrap = get_scrap(abstract_horizontal)
    vertical_scrap = get_scrap(abstract_vertical)

    percentage_vertical_scrap = get_percentage_scrap(
        opts.width, horizontal_scrap)
    percentage_horizontal_scrap = get_percentage_scrap(
        opts.height, vertical_scrap)

    return cint(abstract_horizontal), cint(abstract_vertical), \
        flt(percentage_vertical_scrap), flt(percentage_horizontal_scrap)


def get_total_mounted_pieces_for_printer_the_best_option(opts):
    first_option, fhscrap, fvscrap = get_total_mounted_pieces_for_printer_first_option(
        opts)
    second_option, shscrap, svscrap = get_total_mounted_pieces_for_printer_second_option(
        opts)

    ftscrap = flt(fhscrap) + flt(fvscrap)
    stscrap = flt(shscrap) + flt(svscrap)

    return (first_option, ftscrap) if stscrap > ftscrap else (second_option, svscrap)


def get_scrap(qty):
    return flt(qty) - cint(qty)


def get_percentage_scrap(length, waste):
    return flt(waste) / flt(length)


def get_printer_pieces_assembled(sku, material, final_dimension):
    dimension_doc = frappe.get_doc("Dimensiones", final_dimension)
    sku_doc = frappe.get_doc("Ensamblador de Productos", sku)

    max_value = 0.000
    min_value = 100.000
    best_dimension = dimension_doc

    for each in get_dimensions_for_material(material):
        dimension = frappe.get_doc("Dimensiones", each.material)

        result, scrap = get_total_mounted_pieces_for_printer_the_best_option({
            "width": dimension.width,
            "height": dimension.height,
            "final_width": dimension_doc.width,
            "final_height": dimension_doc.width,
            "margin_width": sku_doc.margin_width,
            "margin_height": sku_doc.margin_height
        })

        if min_value > scrap:
            min_value = scrap
            max_value = result
            best_dimension = dimension

    return max_value, best_dimension


def get_dimensions_for_material(material):
    return frappe.db.sql("""
		SELECT DISTINCT
			parent AS material
		FROM
			`tabMaterial de Impresion Items` 
		WHERE
			parenttype = "Dimensiones"
			AND parentfield = "materials"
			AND materials = "{material}"
	""".format(material=material), as_dict=True)
