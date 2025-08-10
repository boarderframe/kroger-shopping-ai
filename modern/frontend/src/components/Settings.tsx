import React, { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Slider,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Alert,
  IconButton,
  InputAdornment,
  Grid,
  RadioGroup,
  Radio,
  FormLabel,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShipping'
import StoreOutlinedIcon from '@mui/icons-material/StoreOutlined'
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoney'
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined'
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenu'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined'
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'

interface SettingsProps {
  theme: string
  setTheme: (theme: string) => void
  selectedStore: any
  stores: any[]
  onStoreSelect: (store: any) => void
  onFindStores: () => void
  zip: string
  setZip: (zip: string) => void
  radius: number
  setRadius: (radius: number) => void
  loadingStores: boolean
}

// Define comprehensive settings structure
interface UserSettings {
  // Account
  email: string
  phone: string
  name: string
  
  // Delivery/Pickup
  deliveryPreference: 'delivery' | 'pickup' | 'curbside'
  defaultAddress: string
  deliveryInstructions: string
  preferredTimeSlots: string[]
  
  // Shopping Preferences
  dietaryRestrictions: string[]
  allergens: string[]
  preferredBrands: string[]
  avoidBrands: string[]
  organicPreference: 'always' | 'sometimes' | 'never'
  
  // Budget
  weeklyBudget: number
  budgetAlerts: boolean
  priceDropAlerts: boolean
  
  // Notifications
  orderUpdates: boolean
  saleAlerts: boolean
  listReminders: boolean
  emailNotifications: boolean
  smsNotifications: boolean
  pushNotifications: boolean
  
  // Display
  language: string
  units: 'imperial' | 'metric'
  compactView: boolean
  showImages: boolean
  
  // Privacy
  shareData: boolean
  personalization: boolean
  locationTracking: boolean
  purchaseHistory: boolean
}

const dietaryOptions = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Keto',
  'Paleo',
  'Low Sodium',
  'Sugar-Free',
  'Halal',
  'Kosher',
  'Organic Only',
]

const allergenOptions = [
  'Peanuts',
  'Tree Nuts',
  'Milk',
  'Eggs',
  'Wheat',
  'Soy',
  'Fish',
  'Shellfish',
  'Sesame',
]

const timeSlotOptions = [
  'Morning (6am-12pm)',
  'Afternoon (12pm-5pm)',
  'Evening (5pm-9pm)',
  'Weekend Morning',
  'Weekend Afternoon',
]

export default function Settings({
  theme,
  setTheme,
  selectedStore,
  stores,
  onStoreSelect,
  onFindStores,
  zip,
  setZip,
  radius,
  setRadius,
  loadingStores,
}: SettingsProps) {
  const [settings, setSettings] = useState<UserSettings>({
    email: '',
    phone: '',
    name: '',
    deliveryPreference: 'delivery',
    defaultAddress: '',
    deliveryInstructions: '',
    preferredTimeSlots: [],
    dietaryRestrictions: [],
    allergens: [],
    preferredBrands: [],
    avoidBrands: [],
    organicPreference: 'sometimes',
    weeklyBudget: 200,
    budgetAlerts: true,
    priceDropAlerts: true,
    orderUpdates: true,
    saleAlerts: true,
    listReminders: false,
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    language: 'en',
    units: 'imperial',
    compactView: false,
    showImages: true,
    shareData: false,
    personalization: true,
    locationTracking: false,
    purchaseHistory: true,
  })

  const [newBrand, setNewBrand] = useState('')
  const [newAvoidBrand, setNewAvoidBrand] = useState('')
  const [savedMessage, setSavedMessage] = useState(false)

  const handleSettingChange = (key: keyof UserSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = () => {
    // In a real app, this would save to backend
    localStorage.setItem('userSettings', JSON.stringify(settings))
    setSavedMessage(true)
    setTimeout(() => setSavedMessage(false), 3000)
  }

  const addPreferredBrand = () => {
    if (newBrand.trim()) {
      handleSettingChange('preferredBrands', [...settings.preferredBrands, newBrand.trim()])
      setNewBrand('')
    }
  }

  const addAvoidBrand = () => {
    if (newAvoidBrand.trim()) {
      handleSettingChange('avoidBrands', [...settings.avoidBrands, newAvoidBrand.trim()])
      setNewAvoidBrand('')
    }
  }

  return (
    <Box sx={{ width: '100%' }}>
      {savedMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Settings saved successfully!
        </Alert>
      )}

      {/* Store Selection Section */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2, border: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <StoreOutlinedIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Store Selection</Typography>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <TextField
                label="ZIP Code"
                size="small"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOnOutlinedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ px: 1 }}>
                <Typography gutterBottom>Search Radius: {radius} miles</Typography>
                <Slider
                  value={radius}
                  onChange={(_, v) => setRadius(v as number)}
                  min={5}
                  max={100}
                  marks={[
                    { value: 5, label: '5mi' },
                    { value: 25, label: '25mi' },
                    { value: 50, label: '50mi' },
                    { value: 100, label: '100mi' },
                  ]}
                />
              </Box>
              <Button
                variant="contained"
                onClick={onFindStores}
                disabled={loadingStores}
                startIcon={<LocationOnOutlinedIcon />}
              >
                {loadingStores ? 'Finding Stores...' : 'Find Stores'}
              </Button>
            </Stack>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" gutterBottom>
                Available Stores ({stores.length})
              </Typography>
              <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                {stores.map((store) => (
                  <ListItem
                    key={store.locationId}
                    button
                    selected={selectedStore?.locationId === store.locationId}
                    onClick={() => onStoreSelect(store)}
                  >
                    <ListItemIcon>
                      <StoreOutlinedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={store.name}
                      secondary={`${store.address?.city || ''}, ${store.address?.state || ''}`}
                    />
                  </ListItem>
                ))}
                {stores.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                    No stores found. Try searching with your ZIP code.
                  </Typography>
                )}
              </List>
            </Paper>
          </Grid>
        </Grid>

        {selectedStore && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Selected Store: <strong>{selectedStore.name}</strong> - {selectedStore.address?.city}, {selectedStore.address?.state}
          </Alert>
        )}
      </Paper>

      {/* Settings Accordions */}
      <Stack spacing={2}>
        {/* Account Settings */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonOutlineIcon sx={{ mr: 1 }} />
              <Typography>Account Settings</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Name"
                  size="small"
                  value={settings.name}
                  onChange={(e) => handleSettingChange('name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  size="small"
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleSettingChange('email', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlinedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  size="small"
                  value={settings.phone}
                  onChange={(e) => handleSettingChange('phone', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneOutlinedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Default Address"
                  size="small"
                  value={settings.defaultAddress}
                  onChange={(e) => handleSettingChange('defaultAddress', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOnOutlinedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Delivery & Pickup Preferences */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocalShippingOutlinedIcon sx={{ mr: 1 }} />
              <Typography>Delivery & Pickup Preferences</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <FormControl>
                <FormLabel>Preferred Fulfillment Method</FormLabel>
                <RadioGroup
                  row
                  value={settings.deliveryPreference}
                  onChange={(e) => handleSettingChange('deliveryPreference', e.target.value)}
                >
                  <FormControlLabel value="delivery" control={<Radio />} label="Delivery" />
                  <FormControlLabel value="pickup" control={<Radio />} label="Pickup" />
                  <FormControlLabel value="curbside" control={<Radio />} label="Curbside" />
                </RadioGroup>
              </FormControl>

              <TextField
                fullWidth
                label="Delivery Instructions"
                multiline
                rows={3}
                value={settings.deliveryInstructions}
                onChange={(e) => handleSettingChange('deliveryInstructions', e.target.value)}
                placeholder="Leave at door, ring doorbell, etc."
              />

              <Autocomplete
                multiple
                options={timeSlotOptions}
                value={settings.preferredTimeSlots}
                onChange={(_, value) => handleSettingChange('preferredTimeSlots', value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Preferred Time Slots"
                    placeholder="Select preferred delivery times"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option}
                      {...getTagProps({ index })}
                      icon={<AccessTimeOutlinedIcon />}
                    />
                  ))
                }
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Shopping Preferences */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ShoppingCartOutlinedIcon sx={{ mr: 1 }} />
              <Typography>Shopping Preferences</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              {/* Dietary Restrictions */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Dietary Restrictions
                </Typography>
                <Autocomplete
                  multiple
                  options={dietaryOptions}
                  value={settings.dietaryRestrictions}
                  onChange={(_, value) => handleSettingChange('dietaryRestrictions', value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select dietary restrictions"
                      size="small"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        {...getTagProps({ index })}
                        color="primary"
                        size="small"
                      />
                    ))
                  }
                />
              </Box>

              {/* Allergens */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Allergens to Avoid
                </Typography>
                <Autocomplete
                  multiple
                  options={allergenOptions}
                  value={settings.allergens}
                  onChange={(_, value) => handleSettingChange('allergens', value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select allergens"
                      size="small"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        {...getTagProps({ index })}
                        color="error"
                        size="small"
                      />
                    ))
                  }
                />
              </Box>

              {/* Organic Preference */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Organic Preference
                </Typography>
                <ToggleButtonGroup
                  value={settings.organicPreference}
                  exclusive
                  onChange={(_, value) => value && handleSettingChange('organicPreference', value)}
                  size="small"
                >
                  <ToggleButton value="always">Always Organic</ToggleButton>
                  <ToggleButton value="sometimes">When Available</ToggleButton>
                  <ToggleButton value="never">No Preference</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Preferred Brands */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Preferred Brands
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Add brand"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addPreferredBrand()}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={addPreferredBrand}
                    startIcon={<AddIcon />}
                  >
                    Add
                  </Button>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {settings.preferredBrands.map((brand) => (
                    <Chip
                      key={brand}
                      label={brand}
                      onDelete={() =>
                        handleSettingChange(
                          'preferredBrands',
                          settings.preferredBrands.filter((b) => b !== brand)
                        )
                      }
                      color="success"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>

              {/* Brands to Avoid */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Brands to Avoid
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Add brand to avoid"
                    value={newAvoidBrand}
                    onChange={(e) => setNewAvoidBrand(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addAvoidBrand()}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={addAvoidBrand}
                    startIcon={<AddIcon />}
                  >
                    Add
                  </Button>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {settings.avoidBrands.map((brand) => (
                    <Chip
                      key={brand}
                      label={brand}
                      onDelete={() =>
                        handleSettingChange(
                          'avoidBrands',
                          settings.avoidBrands.filter((b) => b !== brand)
                        )
                      }
                      color="error"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Budget Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AttachMoneyOutlinedIcon sx={{ mr: 1 }} />
              <Typography>Budget Settings</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Box>
                <Typography gutterBottom>
                  Weekly Budget: ${settings.weeklyBudget}
                </Typography>
                <Slider
                  value={settings.weeklyBudget}
                  onChange={(_, value) => handleSettingChange('weeklyBudget', value)}
                  min={50}
                  max={500}
                  step={10}
                  marks={[
                    { value: 50, label: '$50' },
                    { value: 200, label: '$200' },
                    { value: 350, label: '$350' },
                    { value: 500, label: '$500' },
                  ]}
                  valueLabelDisplay="auto"
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.budgetAlerts}
                    onChange={(e) => handleSettingChange('budgetAlerts', e.target.checked)}
                  />
                }
                label="Budget alerts when approaching limit"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.priceDropAlerts}
                    onChange={(e) => handleSettingChange('priceDropAlerts', e.target.checked)}
                  />
                }
                label="Price drop alerts for favorited items"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Notifications */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <NotificationsOutlinedIcon sx={{ mr: 1 }} />
              <Typography>Notifications</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Notification Types
                </Typography>
                <Stack>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.orderUpdates}
                        onChange={(e) => handleSettingChange('orderUpdates', e.target.checked)}
                      />
                    }
                    label="Order updates"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.saleAlerts}
                        onChange={(e) => handleSettingChange('saleAlerts', e.target.checked)}
                      />
                    }
                    label="Sale alerts"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.listReminders}
                        onChange={(e) => handleSettingChange('listReminders', e.target.checked)}
                      />
                    }
                    label="Shopping list reminders"
                  />
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Notification Methods
                </Typography>
                <Stack>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.emailNotifications}
                        onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                      />
                    }
                    label="Email notifications"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.smsNotifications}
                        onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
                      />
                    }
                    label="SMS notifications"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.pushNotifications}
                        onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                      />
                    }
                    label="Push notifications"
                  />
                </Stack>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Display Preferences */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PaletteOutlinedIcon sx={{ mr: 1 }} />
              <Typography>Display Preferences</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Theme</InputLabel>
                  <Select
                    value={theme}
                    label="Theme"
                    onChange={(e) => setTheme(e.target.value)}
                  >
                    <MenuItem value="indigo">Indigo</MenuItem>
                    <MenuItem value="slate">Slate</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={settings.language}
                    label="Language"
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                    startAdornment={
                      <InputAdornment position="start">
                        <LanguageOutlinedIcon fontSize="small" />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Español</MenuItem>
                    <MenuItem value="fr">Français</MenuItem>
                    <MenuItem value="de">Deutsch</MenuItem>
                    <MenuItem value="zh">中文</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Units</InputLabel>
                  <Select
                    value={settings.units}
                    label="Units"
                    onChange={(e) => handleSettingChange('units', e.target.value)}
                  >
                    <MenuItem value="imperial">Imperial (lb, oz)</MenuItem>
                    <MenuItem value="metric">Metric (kg, g)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.compactView}
                      onChange={(e) => handleSettingChange('compactView', e.target.checked)}
                    />
                  }
                  label="Compact view (smaller product cards)"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.showImages}
                      onChange={(e) => handleSettingChange('showImages', e.target.checked)}
                    />
                  }
                  label="Show product images"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Privacy Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <SecurityOutlinedIcon sx={{ mr: 1 }} />
              <Typography>Privacy Settings</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.shareData}
                    onChange={(e) => handleSettingChange('shareData', e.target.checked)}
                  />
                }
                label="Share usage data to improve services"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.personalization}
                    onChange={(e) => handleSettingChange('personalization', e.target.checked)}
                  />
                }
                label="Personalized recommendations"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.locationTracking}
                    onChange={(e) => handleSettingChange('locationTracking', e.target.checked)}
                  />
                }
                label="Location-based store suggestions"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.purchaseHistory}
                    onChange={(e) => handleSettingChange('purchaseHistory', e.target.checked)}
                  />
                }
                label="Save purchase history"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Stack>

      {/* Save Button */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSaveSettings}
          startIcon={<SaveIcon />}
        >
          Save All Settings
        </Button>
      </Box>
    </Box>
  )
}