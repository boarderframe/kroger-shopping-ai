import React, { useState, useEffect } from 'react'
import {
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Box,
  Autocomplete,
  Chip,
  Button,
  Popover,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  FormControlLabel,
  Checkbox,
  Divider,
  Badge,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import FilterListIcon from '@mui/icons-material/FilterList'
import ClearIcon from '@mui/icons-material/Clear'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoney'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import SortIcon from '@mui/icons-material/Sort'
import HistoryIcon from '@mui/icons-material/History'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: (value: string) => void
  placeholder?: string
  loading?: boolean
  suggestions?: string[]
  recentSearches?: string[]
  trendingSearches?: string[]
  filters?: SearchFilters
  onFiltersChange?: (filters: SearchFilters) => void
  showFilters?: boolean
}

interface SearchFilters {
  sort: 'discountDesc' | 'relevance' | 'priceAsc' | 'priceDesc' | 'brandAsc' | 'nameAsc' | 'nameDesc'
  priceRange: [number, number]
  onSaleOnly: boolean
  categories: string[]
  brands: string[]
  dietary: string[]
  inStockOnly: boolean
}

const defaultFilters: SearchFilters = {
  sort: 'discountDesc',
  priceRange: [0, 100],
  onSaleOnly: false,
  categories: [],
  brands: [],
  dietary: [],
  inStockOnly: true,
}

const categoryOptions = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Bakery',
  'Frozen',
  'Pantry',
  'Beverages',
  'Snacks',
  'Health & Beauty',
  'Household',
  'Baby',
  'Pet',
]

const dietaryOptions = [
  'Organic',
  'Gluten-Free',
  'Vegan',
  'Vegetarian',
  'Keto',
  'Sugar-Free',
  'Low Sodium',
  'Non-GMO',
]

export default function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = 'Search for products...',
  loading = false,
  suggestions = [],
  recentSearches = [],
  trendingSearches = [],
  filters = defaultFilters,
  onFiltersChange,
  showFilters = true,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value)
  const [filterAnchor, setFilterAnchor] = useState<HTMLButtonElement | null>(null)
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters)
  const [activeFilterCount, setActiveFilterCount] = useState(0)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    // Count active filters
    let count = 0
    if (localFilters.onSaleOnly) count++
    if (localFilters.inStockOnly === false) count++
    if (localFilters.categories.length > 0) count += localFilters.categories.length
    if (localFilters.brands.length > 0) count += localFilters.brands.length
    if (localFilters.dietary.length > 0) count += localFilters.dietary.length
    if (localFilters.priceRange[0] > 0 || localFilters.priceRange[1] < 100) count++
    // Do not count sort in the filter badge; sort is not a filter
    setActiveFilterCount(count)
  }, [localFilters])

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const q = (localValue || '').trim()
    onChange(q)
    onSearch(q)
  }

  const handleFilterOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setFilterAnchor(event.currentTarget)
  }

  const handleFilterClose = () => {
    setFilterAnchor(null)
  }

  const handleFilterApply = () => {
    onFiltersChange?.(localFilters)
    handleFilterClose()
  }

  const handleFilterReset = () => {
    setLocalFilters(defaultFilters)
    onFiltersChange?.(defaultFilters)
  }

  const handleClearSearch = () => {
    setLocalValue('')
    onChange('')
  }

  // Combine all suggestions for autocomplete
  const allSuggestions = [
    ...(trendingSearches.length > 0 
      ? [{ title: 'Trending', items: trendingSearches.map(s => ({ label: s, icon: 'trending' })) }]
      : []),
    ...(recentSearches.length > 0
      ? [{ title: 'Recent', items: recentSearches.map(s => ({ label: s, icon: 'history' })) }]
      : []),
    ...(suggestions.length > 0
      ? [{ title: 'Suggestions', items: suggestions.map(s => ({ label: s, icon: 'search' })) }]
      : []),
  ]

  const flatSuggestions = allSuggestions.flatMap(group => group.items.map(item => item.label))
  const uniqueSuggestions = Array.from(new Set(flatSuggestions))

  return (
    <Box component="form" onSubmit={handleSearch} sx={{ width: '100%' }}>
      <Paper
        elevation={2}
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1,
          borderRadius: 2,
        }}
      >
        <Autocomplete
          freeSolo
          fullWidth
          value={localValue}
          onChange={(_, newValue) => {
            if (typeof newValue === 'string') {
              setLocalValue(newValue)
              onChange(newValue)
            }
          }}
          inputValue={localValue}
          onInputChange={(_, newValue) => {
            setLocalValue(newValue)
          }}
          options={uniqueSuggestions}
          groupBy={(option) => {
            const group = allSuggestions.find(g => 
              g.items.some(item => item.label === option)
            )
            return group?.title || 'Suggestions'
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="standard"
              placeholder={placeholder}
              onKeyDown={(e)=>{
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSearch(e)
                }
              }}
              InputProps={{
                ...params.InputProps,
                disableUnderline: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    {loading && <CircularProgress size={20} />}
                    {localValue && !loading && (
                      <IconButton size="small" onClick={handleClearSearch} aria-label="Clear search">
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
              }}
            />
          )}
          renderOption={(props, option) => {
            const group = allSuggestions.find(g => 
              g.items.some(item => item.label === option)
            )
            const item = group?.items.find(i => i.label === option)
            
            return (
              <li {...props} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 4 }}>
                {item?.icon === 'trending' && <TrendingUpIcon fontSize="small" color="action" />}
                {item?.icon === 'history' && <HistoryIcon fontSize="small" color="action" />}
                {item?.icon === 'search' && <SearchIcon fontSize="small" color="action" />}
                <Typography variant="body2">{option}</Typography>
              </li>
            )
          }}
          renderGroup={(params) => (
            <Box key={params.key}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ px: 2, py: 1, display: 'block', fontWeight: 600 }}
              >
                {params.group}
              </Typography>
              {params.children}
            </Box>
          )}
        />

        <IconButton
          color="primary"
          type="submit"
          disabled={loading || !localValue}
          sx={{ ml: 1 }}
          aria-label="Search"
        >
          <SearchIcon />
        </IconButton>

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        {showFilters && (
          <Badge badgeContent={activeFilterCount} color="primary" invisible={activeFilterCount===0}>
            <IconButton
              color="primary"
              onClick={handleFilterOpen}
              sx={{
                bgcolor: activeFilterCount > 0 ? 'action.selected' : 'transparent',
              }}
              aria-label="Filters"
            >
              <FilterListIcon />
            </IconButton>
          </Badge>
        )}
      </Paper>

      {/* Filter Popover */}
      <Popover
        open={Boolean(filterAnchor)}
        anchorEl={filterAnchor}
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 3, width: 400, maxHeight: '80vh', overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>

          <Stack spacing={3}>
            {/* Sort */}
            <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={localFilters.sort}
                label="Sort By"
                onChange={(e) => setLocalFilters({ ...localFilters, sort: e.target.value as any })}
                startAdornment={
                  <InputAdornment position="start">
                    <SortIcon fontSize="small" />
                  </InputAdornment>
                }
              >
                <MenuItem value="discountDesc">Best Discount (default)</MenuItem>
                <MenuItem value="relevance">Relevance</MenuItem>
                <MenuItem value="priceAsc">Price: Low to High</MenuItem>
                <MenuItem value="priceDesc">Price: High to Low</MenuItem>
                <MenuItem value="brandAsc">Brand: A → Z</MenuItem>
                <MenuItem value="nameAsc">Name: A → Z</MenuItem>
                <MenuItem value="nameDesc">Name: Z → A</MenuItem>
              </Select>
            </FormControl>

            {/* Price Range */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Price Range: ${localFilters.priceRange[0]} - ${localFilters.priceRange[1]}
              </Typography>
              <Slider
                value={localFilters.priceRange}
                onChange={(_, value) => setLocalFilters({ ...localFilters, priceRange: value as [number, number] })}
                valueLabelDisplay="auto"
                min={0}
                max={100}
                marks={[
                  { value: 0, label: '$0' },
                  { value: 25, label: '$25' },
                  { value: 50, label: '$50' },
                  { value: 100, label: '$100+' },
                ]}
              />
            </Box>

            {/* Quick Filters */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Quick Filters
              </Typography>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={localFilters.onSaleOnly}
                      onChange={(e) => setLocalFilters({ ...localFilters, onSaleOnly: e.target.checked })}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocalOfferOutlinedIcon fontSize="small" />
                      <span>On Sale Only</span>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={localFilters.inStockOnly}
                      onChange={(e) => setLocalFilters({ ...localFilters, inStockOnly: e.target.checked })}
                    />
                  }
                  label="In Stock Only"
                />
              </Stack>
            </Box>

            {/* Categories */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Categories
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {categoryOptions.map((category) => (
                  <Chip
                    key={category}
                    label={category}
                    onClick={() => {
                      const newCategories = localFilters.categories.includes(category)
                        ? localFilters.categories.filter(c => c !== category)
                        : [...localFilters.categories, category]
                      setLocalFilters({ ...localFilters, categories: newCategories })
                    }}
                    color={localFilters.categories.includes(category) ? 'primary' : 'default'}
                    variant={localFilters.categories.includes(category) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Box>

            {/* Dietary */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Dietary Preferences
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {dietaryOptions.map((diet) => (
                  <Chip
                    key={diet}
                    label={diet}
                    onClick={() => {
                      const newDietary = localFilters.dietary.includes(diet)
                        ? localFilters.dietary.filter(d => d !== diet)
                        : [...localFilters.dietary, diet]
                      setLocalFilters({ ...localFilters, dietary: newDietary })
                    }}
                    color={localFilters.dietary.includes(diet) ? 'success' : 'default'}
                    variant={localFilters.dietary.includes(diet) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Box>

            <Divider />

            {/* Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={handleFilterReset} color="inherit">
                Clear All
              </Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={handleFilterClose}>Cancel</Button>
                <Button variant="contained" onClick={handleFilterApply}>
                  Apply Filters
                </Button>
              </Box>
            </Box>
          </Stack>
        </Box>
      </Popover>
    </Box>
  )
}