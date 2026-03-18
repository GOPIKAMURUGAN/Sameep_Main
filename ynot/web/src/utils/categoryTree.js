"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCategoryTree } from "../services/onboardingApi";

export function getSelectedLeafIds(nodes, selectedIds) {
  return selectedIds.filter((id) => {
    const node = nodes[id];
    return node && node.children.length === 0;
  });
}

export function useCategoryTree({ setupSelectedCategory, overrideCatId }) {
  const [nodes, setNodes] = useState({});
  const [rootIds, setRootIds] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [parentMap, setParentMap] = useState({});

  const catId = useMemo(
    () =>
      overrideCatId ||
      setupSelectedCategory?._id ||
      setupSelectedCategory?.id ||
      setupSelectedCategory?.categoryId,
    [
      overrideCatId,
      setupSelectedCategory?._id,
      setupSelectedCategory?.id,
      setupSelectedCategory?.categoryId,
    ]
  );

  useEffect(() => {
    if (!catId) return;

    async function loadTree() {
      const rawTree = await fetchCategoryTree(catId);
      const normalizedRoot = rawTree?.id
        ? normalizeTree(rawTree)
        : null;
      const roots = normalizedRoot?.children || [];

      const nodesMap = {};
      const pMap = {};

      function walk(node, parentId = null) {
        nodesMap[node._id] = {
          id: node._id,
          data: node,
          children: (node.children || []).map((child) => child._id),
          expanded: false,
        };

        pMap[node._id] = parentId;
        node.children?.forEach((child) => walk(child, node._id));
      }

      roots.forEach((root) => walk(root));

      setNodes(nodesMap);
      setParentMap(pMap);
      setRootIds(roots.map((root) => root._id));
      setSelectedIds(Object.keys(nodesMap));
    }

    loadTree().catch((error) => {
      console.error("Failed to load category tree", error);
      setNodes({});
      setParentMap({});
      setRootIds([]);
      setSelectedIds([]);
    });
  }, [catId]);

  const toggleNode = (id) => {
    setNodes((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        expanded: !prev[id].expanded,
      },
    }));
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const selectedSet = new Set(prev);
      const isSelected = selectedSet.has(id);
      const descendants = getAllDescendants(id, nodes);
      const ancestors = getAllAncestors(id, parentMap);

      if (isSelected) {
        selectedSet.delete(id);
        descendants.forEach((descendant) => selectedSet.delete(descendant));

        ancestors.forEach((parentId) => {
          if (!hasAnySelectedChild(parentId, selectedSet, nodes)) {
            selectedSet.delete(parentId);
          }
        });
      } else {
        selectedSet.add(id);
        descendants.forEach((descendant) => selectedSet.add(descendant));
        ancestors.forEach((ancestorId) => selectedSet.add(ancestorId));
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

function normalizeTree(node) {
  return {
    ...node,
    _id: node.id,
    children: (node.children || []).map(normalizeTree),
  };
}

function getAllDescendants(id, map) {
  const node = map[id];
  if (!node) return [];

  let result = [...node.children];
  node.children.forEach((childId) => {
    result = result.concat(getAllDescendants(childId, map));
  });
  return result;
}

function getAllAncestors(id, parentMap) {
  const result = [];
  let current = parentMap[id];

  while (current) {
    result.push(current);
    current = parentMap[current];
  }

  return result;
}

function hasAnySelectedChild(parentId, selectedSet, map) {
  const node = map[parentId];
  if (!node) return false;
  return node.children.some((childId) => selectedSet.has(childId));
}
