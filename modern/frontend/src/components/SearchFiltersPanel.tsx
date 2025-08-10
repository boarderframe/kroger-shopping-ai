import React from 'react'
import { Box, Paper, Stack, Typography, Divider, FormControl, InputLabel, Select, MenuItem, TextField, FormControlLabel, Checkbox, Slider, Chip, Button } from '@mui/material'

export interface SearchFiltersPanelProps {
  sort: 'discountDesc'|'relevance'|'priceAsc'|'priceDesc'|'brandAsc'|'nameAsc'|'nameDesc'
  onChangeSort: (v: SearchFiltersPanelProps['sort']) => void
  brandFilter: string
  onChangeBrandFilter: (v: string) => void
  onSaleOnly: boolean
  onChangeOnSaleOnly: (v: boolean) => void
  priceRange: [number, number]
  onChangePriceRange: (v: [number, number]) => void
  categoryChips: string[]
  selectedCategory: string | null
  onChangeSelectedCategory: (v: string | null) => void
  onClearAll: () => void
}

export default function SearchFiltersPanel({
  sort,
  onChangeSort,
  brandFilter,
  onChangeBrandFilter,
  onSaleOnly,
  onChangeOnSaleOnly,
  priceRange,
  onChangePriceRange,
  categoryChips,
  selectedCategory,
  onChangeSelectedCategory,
  onClearAll,
}: SearchFiltersPanelProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2, position: 'sticky', top: 16 }}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1">Filters</Typography>
          <Button size="small" color="inherit" onClick={onClearAll}>Reset</Button>
        </Box>
        <Divider />

        <FormControl fullWidth size="small">
          <InputLabel id="sort-by-label">Sort By</InputLabel>
          <Select
            labelId="sort-by-label"
            label="Sort By"
            value={sort}
            onChange={(e)=> onChangeSort(e.target.value as any)}
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

        <TextField
          size="small"
          label="Brand contains"
          placeholder="e.g., Kroger, Lay's"
          value={brandFilter}
          onChange={(e)=> onChangeBrandFilter(e.target.value)}
        />

        <FormControlLabel
          control={<Checkbox checked={onSaleOnly} onChange={(e)=> onChangeOnSaleOnly(e.target.checked)} />}
          label="On sale only"
        />

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Price: ${priceRange[0]} - ${priceRange[1]}
          </Typography>
          <Slider
            size="small"
            min={0}
            max={100}
            value={priceRange}
            valueLabelDisplay="auto"
            onChange={(_, v)=> onChangePriceRange(v as [number, number])}
          />
        </Box>

        {categoryChips.length>0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>Categories</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {categoryChips.map(c => (
                <Chip
                  key={c}
                  label={c}
                  color={selectedCategory===c? 'primary':'default'}
                  variant={selectedCategory===c? 'filled':'outlined'}
                  onClick={()=> onChangeSelectedCategory(selectedCategory===c? null : c)}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Paper>
  )
}



