import React, { useState, useEffect } from 'react'
import {
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import type { ShoppingList, ShoppingListItem } from '../types/api'

const apiBase = 'http://localhost:8000'

export default function Lists() {
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null)
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false)
  const [newItemDescription, setNewItemDescription] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState(1)
  const [editingListName, setEditingListName] = useState<string | null>(null)
  const [tempListName, setTempListName] = useState('')

  // Load lists on mount
  useEffect(() => {
    loadLists()
  }, [])

  async function loadLists() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${apiBase}/api/lists`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setLists(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load lists')
    } finally {
      setLoading(false)
    }
  }

  async function createList() {
    if (!newListName.trim()) return
    
    try {
      const response = await fetch(`${apiBase}/api/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newListName.trim(), items: [] })
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const newList = await response.json()
      setLists(prev => [...prev, newList])
      setNewListName('')
      setCreateDialogOpen(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create list')
    }
  }

  async function updateList(listId: string, updates: Partial<ShoppingList>) {
    try {
      const response = await fetch(`${apiBase}/api/lists/${listId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const updatedList = await response.json()
      setLists(prev => prev.map(l => l.id === listId ? updatedList : l))
      if (selectedList?.id === listId) {
        setSelectedList(updatedList)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update list')
    }
  }

  async function deleteList(listId: string) {
    if (!confirm('Are you sure you want to delete this list?')) return
    
    try {
      const response = await fetch(`${apiBase}/api/lists/${listId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      setLists(prev => prev.filter(l => l.id !== listId))
      if (selectedList?.id === listId) {
        setSelectedList(null)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete list')
    }
  }

  function addItemToList() {
    if (!selectedList || !newItemDescription.trim()) return
    
    const newItem: ShoppingListItem = {
      id: `item-${Date.now()}`,
      description: newItemDescription.trim(),
      quantity: newItemQuantity,
      checked: false
    }
    
    const updatedItems = [...(selectedList.items || []), newItem]
    updateList(selectedList.id, { items: updatedItems })
    
    setNewItemDescription('')
    setNewItemQuantity(1)
    setAddItemDialogOpen(false)
  }

  function toggleItemCheck(listId: string, itemId: string) {
    const list = lists.find(l => l.id === listId)
    if (!list) return
    
    const updatedItems = list.items.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    )
    updateList(listId, { items: updatedItems })
  }

  function removeItemFromList(listId: string, itemId: string) {
    const list = lists.find(l => l.id === listId)
    if (!list) return
    
    const updatedItems = list.items.filter(item => item.id !== itemId)
    updateList(listId, { items: updatedItems })
  }

  function startEditingListName(list: ShoppingList) {
    setEditingListName(list.id)
    setTempListName(list.name)
  }

  function saveListName(listId: string) {
    if (tempListName.trim()) {
      updateList(listId, { name: tempListName.trim() })
    }
    setEditingListName(null)
    setTempListName('')
  }

  if (loading && lists.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Stack spacing={3}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Shopping Lists</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            New List
          </Button>
        </Box>

        {lists.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No lists yet. Create your first shopping list!
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px 1fr' }, gap: 2 }}>
            {/* Lists sidebar */}
            <Paper variant="outlined" sx={{ p: 1, maxHeight: 400, overflow: 'auto' }}>
              <List dense>
                {lists.map(list => (
                  <ListItem
                    key={list.id}
                    button
                    selected={selectedList?.id === list.id}
                    onClick={() => setSelectedList(list)}
                  >
                    <ListItemText
                      primary={list.name}
                      secondary={`${list.items?.length || 0} items`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteList(list.id)
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>

            {/* List details */}
            {selectedList ? (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  {editingListName === selectedList.id ? (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        size="small"
                        value={tempListName}
                        onChange={(e) => setTempListName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') saveListName(selectedList.id)
                        }}
                        autoFocus
                      />
                      <IconButton size="small" onClick={() => saveListName(selectedList.id)}>
                        <CheckIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => setEditingListName(null)}>
                        <CloseIcon />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography variant="h6">{selectedList.name}</Typography>
                      <IconButton size="small" onClick={() => startEditingListName(selectedList)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setAddItemDialogOpen(true)}
                  >
                    Add Item
                  </Button>
                </Box>

                <Divider sx={{ mb: 1 }} />

                {selectedList.items?.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No items in this list yet.
                  </Typography>
                ) : (
                  <List>
                    {selectedList.items?.map(item => (
                      <ListItem key={item.id} dense>
                        <Checkbox
                          edge="start"
                          checked={item.checked || false}
                          onChange={() => toggleItemCheck(selectedList.id, item.id)}
                        />
                        <ListItemText
                          primary={
                            <Typography
                              sx={{
                                textDecoration: item.checked ? 'line-through' : 'none',
                                color: item.checked ? 'text.secondary' : 'text.primary'
                              }}
                            >
                              {item.description}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <Chip label={`Qty: ${item.quantity}`} size="small" />
                              {item.brand && <Typography variant="caption">{item.brand}</Typography>}
                              {item.price && <Typography variant="caption">${item.price.toFixed(2)}</Typography>}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => removeItemFromList(selectedList.id, item.id)}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}

                {selectedList.items && selectedList.items.length > 0 && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">
                      Checked: {selectedList.items.filter(i => i.checked).length} / {selectedList.items.length}
                    </Typography>
                  </Box>
                )}
              </Paper>
            ) : (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Select a list to view details
                </Typography>
              </Paper>
            )}
          </Box>
        )}
      </Paper>

      {/* Create List Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create New List</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="List Name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') createList()
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={createList} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onClose={() => setAddItemDialogOpen(false)}>
        <DialogTitle>Add Item to List</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              label="Item Description"
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
            />
            <TextField
              fullWidth
              type="number"
              label="Quantity"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
              inputProps={{ min: 1 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddItemDialogOpen(false)}>Cancel</Button>
          <Button onClick={addItemToList} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}