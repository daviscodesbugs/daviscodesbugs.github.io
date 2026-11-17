---
title: "I Wrote a CLI That Fixes Broken STL Files for 3D Printing"
date: 2026-03-23
description: "Why STL meshes break, what the defects mean, and how to repair them automatically from the command line — plus batch mode for entire directories."
tags:
  - 3d-printing
  - python
  - cli
  - tools
draft: false
---

If you've spent any time in 3D printing, you've hit the wall where a perfectly good-looking model fails in the slicer — strange gaps, hollow shells, warning icons about non-manifold geometry. The file looks fine in the viewport. The slicer disagrees.

I got tired of manually running files through Meshmixer's repair wizard, so I wrote a command-line tool to do it automatically: **stl-repair**.

---

## What Makes an STL "Broken"?

An STL file describes a 3D surface as a mesh of triangles. For a slicer to produce correct toolpaths, the mesh should be **watertight** — a closed shell with no gaps, ambiguous surfaces, or zero-area triangles. Think of it like a balloon: you can fill it with air, and the boundary is perfectly sealed.

When the mesh isn't watertight, you get defects. The most common ones:

**Naked edges** — An edge shared by only one triangle instead of two. Every interior edge in a watertight mesh is "glued" between two faces. A naked edge is a gap in the surface. Common cause: boolean operations in Blender or Fusion 360 that don't perfectly align, or exported CAD files where tolerance mismatches leave tiny cracks.

**Non-manifold edges** — An edge shared by three or more faces. Now the surface is ambiguous — there's no clear inside or outside. Slicers either crash or produce completely wrong geometry. This is the most severe defect.

**Inverted normals** — Each triangle has a "front face" determined by vertex winding order. Inverted normals point inward instead of outward. Usually caused by mirror operations or imported meshes from tools with different conventions. Modern slicers often auto-correct this, but not always.

**Degenerate faces** — Zero-area triangles (three collinear vertices). Harmless to print but confuse normal calculations and inflate file size. Common output of over-tessellated CAD exports.

**Disjoint shells** — Multiple disconnected mesh bodies. One shell is normal. Three might be intentional (separate parts in one file). Twenty shells usually means something went wrong.

---

## The Tool

```bash
# Install
pip install -e .

# Analyze what's wrong (no repair)
stl-repair model.stl --analyze-only

# Repair to a new file
stl-repair model.stl -o model_fixed.stl

# Batch repair a whole directory
stl-repair ./prints --batch

# Machine-readable output for scripts
stl-repair model.stl --summary-json
```

The output is intentionally modeled after Formware's diagnostic format — terse counts that tell you exactly what you're dealing with:

```
-> Analyzing file
--> 42 Naked edges
--> 1 Non-Planar holes
--> 0 Non-Manifold edges
--> 0 Inverted normals
--> 0 Duplicate faces
--> 145 Degenerate faces
--> 2 Disjoint shells
-> Repairing
-> File repaired
Time needed for repair (ms): 4218
--> Vertex count changed from 6428 to 7220 (+792)
--> Triangle count changed from 12808 to 14436 (+1628)
-> Saved to model_repaired.stl
-> Validation: mesh is watertight ✓
```

---

## Adaptive Repair Strategy

Not all broken meshes need the same fix. The tool profiles the defect pattern and selects the lightest repair pipeline that will work:

1. **Only degenerate/duplicate faces?** Clean them up. No geometry change.
2. **Planar holes?** Fill with triangle fans. Fast, lossless.
3. **Naked edges + non-manifold?** Full pipeline: bridge boundary edges → boolean union → post-process cleanup.
4. **Severe damage?** Fall back to **alpha-wrap remeshing** — generate a new watertight mesh that approximates the original surface.

Alpha-wrap is the nuclear option. It reliably produces a watertight mesh regardless of how badly the input is broken, but it changes the vertex count and may soften fine details. Use `--no-wrap` to skip it if you want to preserve the original triangulation.

---

## Batch Mode

The most useful addition for a printing workflow is `--batch`:

```bash
stl-repair ./my-print-files --batch
```

It recursively finds all `.stl` files in the directory, repairs each one, writes `<name>_repaired.stl` alongside the original, and prints a summary table:

```
===================================================
BATCH SUMMARY
===================================================
File                              Status         Time (ms)
--------------------------------------------------
Untitled-cutout test.stl          ✗ incomplete        4218
gripper_arm.stl                   ✓ repaired          1089
bracket_v3.stl                    ✓ clean              143
```

It skips files already named `*_repaired.stl` so you can run it repeatedly without snowballing.

---

## Pipeline Integration with --summary-json

The `--summary-json` flag outputs machine-readable JSON instead of human-readable text:

```bash
stl-repair model.stl --summary-json
```

```json
{
  "file": "model.stl",
  "vertices": 6428,
  "faces": 12808,
  "has_defects": true,
  "is_watertight": false,
  "defects": {
    "naked_edges": 42,
    "planar_holes": 0,
    "non_planar_holes": 1,
    "total_holes": 1,
    "non_manifold_edges": 0,
    "inverted_normals": 0,
    "duplicate_faces": 0,
    "degenerate_faces": 145,
    "disjoint_shells": 2
  }
}
```

With `--batch --summary-json`, you get an array — one entry per file. Useful for CI pipelines that need to validate STL files before committing them.

---

## What I Learned

A few things from building this:

**Alpha-wrap is surprisingly robust.** When CGAL's alpha-wrap algorithm runs on a badly broken mesh, it almost always produces a valid result. It's slower than direct repair (~4-10x), but for meshes with severe non-manifold geometry, it's the only reliable option.

**Hole classification matters.** Planar holes (flat openings like missing end caps) are easy to fill correctly. Non-planar holes (torn geometry) require a different approach — you can't just cap them with a flat face. SVD on the boundary loop vertices is a clean way to classify which kind you have.

**Slicers are more forgiving than you think.** PrusaSlicer and Cura both do significant auto-repair at import. If a mesh has only a few naked edges, they'll often print correctly anyway. The cases where repair actually matters are non-manifold edges (slicers can't recover from these) and severe naked-edge counts.

---

## Get It

Source is on [GitHub](https://github.com/daviscodesbugs). Requires Python 3.11+, trimesh, and CGAL (for alpha-wrap). Install CGAL via conda or your system package manager.

```bash
pip install trimesh numpy scipy
# For alpha-wrap:
conda install -c conda-forge cgal-cpp  # or: apt install libcgal-dev
```

The tool is dual-licensed: use it however you want.
