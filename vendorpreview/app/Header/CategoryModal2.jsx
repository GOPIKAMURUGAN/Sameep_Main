import { useEffect, useMemo, useState } from "react";
import { fetchCategories } from "./ApiService";

/**
 * Uses full tree API directly
 * No recursive API calls
 */
export function useCategoryTree({ setupSelectedCategory, overrideCatId }) {
  const [nodes, setNodes] = useState({});
  const [rootIds, setRootIds] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [parentMap, setParentMap] = useState({});

  const catId = useMemo(
    () =>
      overrideCatId ||
      setupSelectedCategory?._id ||
      setupSelectedCategory?.id,
    [overrideCatId, setupSelectedCategory?._id, setupSelectedCategory?.id]
  );

  useEffect(() => {
    if (!catId) return;

    const loadTree = async () => {
      // 🔥 fetch full tree once
      const fullTree = await fetchCategories(catId);

      const nodesMap = {};
      const pMap = {};

      // 🔥 flatten full tree
      function walk(node, parentId = null) {
        nodesMap[node._id] = {
          id: node._id,
          data: node,
          children: (node.children || []).map((c) => c._id),
          expanded: false,
        };

        pMap[node._id] = parentId;

        node.children?.forEach((child) =>
          walk(child, node._id)
        );
      }

      fullTree.forEach((root) => {
        walk(root, null);
      });

      setNodes(nodesMap);
      setParentMap(pMap);
      setRootIds(fullTree.map((r) => r._id));

      // Optional: auto select all
      setSelectedIds(Object.keys(nodesMap));
    };

    loadTree();
  }, [catId]);

  /* ================= TOGGLE EXPAND ================= */

  const toggleNode = (id) => {
    setNodes((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        expanded: !prev[id].expanded,
      },
    }));
  };

  /* ================= HELPERS ================= */

  const getAllDescendants = (id, map) => {
    const node = map[id];
    if (!node) return [];

    let result = [...node.children];
    node.children.forEach((cid) => {
      result = result.concat(getAllDescendants(cid, map));
    });
    return result;
  };

  const getAllAncestors = (id, pMap) => {
    const result = [];
    let current = pMap[id];
    while (current) {
      result.push(current);
      current = pMap[current];
    }
    return result;
  };

  const hasAnySelectedChild = (parentId, selectedSet, map) => {
    const node = map[parentId];
    if (!node) return false;
    return node.children.some((cid) => selectedSet.has(cid));
  };

  /* ================= TOGGLE SELECT ================= */

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const selectedSet = new Set(prev);
      const isSelected = selectedSet.has(id);

      const descendants = getAllDescendants(id, nodes);
      const ancestors = getAllAncestors(id, parentMap);

      if (isSelected) {
        selectedSet.delete(id);
        descendants.forEach((d) => selectedSet.delete(d));

        ancestors.forEach((pid) => {
          if (!hasAnySelectedChild(pid, selectedSet, nodes)) {
            selectedSet.delete(pid);
          }
        });
      } else {
        selectedSet.add(id);
        descendants.forEach((d) => selectedSet.add(d));
        ancestors.forEach((a) => selectedSet.add(a));
      }

      return Array.from(selectedSet);
    });
  };

  return {
    nodes,
    rootIds,
    toggleNode,
    toggleSelect,
    selectedIds,
  };
}