import React from 'react'
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Grid,
  Box,
  Chip,
  Avatar,
  Stack,
  IconButton,
  Skeleton,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Badge,
} from '@mui/material'
import StoreOutlinedIcon from '@mui/icons-material/StoreOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import DirectionsOutlinedIcon from '@mui/icons-material/DirectionsOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShipping'
import ShoppingCartCheckoutOutlinedIcon from '@mui/icons-material/ShoppingCartCheckoutOutlined'
import StarOutlineIcon from '@mui/icons-material/StarOutline'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'

interface Store {
  locationId: string
  name: string
  address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
  }
  distance?: number
  phone?: string
  hours?: {
    today?: string
    isOpen?: boolean
  }
  services?: string[]
  rating?: number
  isFavorite?: boolean
}

interface StoreListProps {
  stores: Store[]
  selectedStore: Store | null
  onSelectStore: (store: Store) => void
  loading?: boolean
  viewMode?: 'cards' | 'list'
}

const serviceIcons: Record<string, React.ReactNode> = {
  delivery: <LocalShippingOutlinedIcon fontSize="small" />,
  pickup: <ShoppingCartCheckoutOutlinedIcon fontSize="small" />,
  curbside: <DirectionsOutlinedIcon fontSize="small" />,
}

const StoreCardSkeleton = () => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </Box>
      </Box>
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="50%" />
      <Box sx={{ mt: 2 }}>
        <Skeleton variant="rectangular" height={32} />
      </Box>
    </CardContent>
  </Card>
)

const StoreCard = ({
  store,
  isSelected,
  onSelect,
  onToggleFavorite,
}: {
  store: Store
  isSelected: boolean
  onSelect: () => void
  onToggleFavorite: () => void
}) => {
  return (
    <Card
      variant={isSelected ? 'elevation' : 'outlined'}
      elevation={isSelected ? 3 : 0}
      sx={{
        height: '100%',
        position: 'relative',
        border: isSelected ? 2 : 1,
        borderColor: isSelected ? 'primary.main' : 'divider',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)',
        },
      }}
    >
      {isSelected && (
        <Chip
          label="Selected"
          color="primary"
          size="small"
          icon={<CheckCircleOutlineIcon />}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1,
          }}
        />
      )}

      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: isSelected ? 'primary.main' : 'action.selected',
              mr: 2,
            }}
          >
            <StoreOutlinedIcon />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="div" noWrap>
              {store.name}
            </Typography>
            {store.rating && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <StarOutlineIcon fontSize="small" sx={{ color: 'warning.main' }} />
                <Typography variant="body2" color="text.secondary">
                  {store.rating.toFixed(1)}
                </Typography>
              </Box>
            )}
          </Box>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite()
            }}
            color={store.isFavorite ? 'error' : 'default'}
          >
            {store.isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
        </Box>

        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOnOutlinedIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {store.address?.street && `${store.address.street}, `}
              {store.address?.city}, {store.address?.state} {store.address?.zip}
            </Typography>
          </Box>

          {store.distance && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DirectionsOutlinedIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {store.distance.toFixed(1)} miles away
              </Typography>
            </Box>
          )}

          {store.phone && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PhoneOutlinedIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {store.phone}
              </Typography>
            </Box>
          )}

          {store.hours?.today && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTimeOutlinedIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {store.hours.today}
              </Typography>
              {store.hours.isOpen !== undefined && (
                <Chip
                  label={store.hours.isOpen ? 'Open' : 'Closed'}
                  size="small"
                  color={store.hours.isOpen ? 'success' : 'default'}
                  variant="outlined"
                />
              )}
            </Box>
          )}
        </Stack>

        {store.services && store.services.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
            {store.services.map((service) => (
              <Chip
                key={service}
                label={service}
                size="small"
                variant="outlined"
                icon={serviceIcons[service.toLowerCase()] as any}
              />
            ))}
          </Stack>
        )}
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          fullWidth
          variant={isSelected ? 'contained' : 'outlined'}
          onClick={onSelect}
          startIcon={isSelected ? <CheckCircleOutlineIcon /> : <StoreOutlinedIcon />}
        >
          {isSelected ? 'Selected' : 'Select Store'}
        </Button>
        <IconButton size="small" color="primary">
          <DirectionsOutlinedIcon />
        </IconButton>
      </CardActions>
    </Card>
  )
}

const StoreListItem = ({
  store,
  isSelected,
  onSelect,
  onToggleFavorite,
}: {
  store: Store
  isSelected: boolean
  onSelect: () => void
  onToggleFavorite: () => void
}) => {
  return (
    <>
      <ListItem
        button
        selected={isSelected}
        onClick={onSelect}
        sx={{
          borderRadius: 1,
          mb: 1,
          bgcolor: isSelected ? 'action.selected' : 'transparent',
        }}
      >
        <ListItemAvatar>
          <Badge
            invisible={!isSelected}
            badgeContent={<CheckCircleOutlineIcon />}
            color="primary"
          >
            <Avatar sx={{ bgcolor: isSelected ? 'primary.main' : 'action.selected' }}>
              <StoreOutlinedIcon />
            </Avatar>
          </Badge>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={isSelected ? 600 : 400}>
                {store.name}
              </Typography>
              {store.hours?.isOpen !== undefined && (
                <Chip
                  label={store.hours.isOpen ? 'Open' : 'Closed'}
                  size="small"
                  color={store.hours.isOpen ? 'success' : 'default'}
                  variant="outlined"
                />
              )}
              {store.distance && (
                <Typography variant="body2" color="text.secondary">
                  • {store.distance.toFixed(1)} mi
                </Typography>
              )}
            </Box>
          }
          secondary={
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {store.address?.city}, {store.address?.state}
              </Typography>
              {store.services && store.services.length > 0 && (
                <Stack direction="row" spacing={0.5}>
                  {store.services.map((service) => (
                    <Chip
                      key={service}
                      label={service}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.75rem' }}
                    />
                  ))}
                </Stack>
              )}
            </Stack>
          }
        />
        <ListItemSecondaryAction>
          <Stack direction="row" spacing={1}>
            <IconButton
              edge="end"
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite()
              }}
              color={store.isFavorite ? 'error' : 'default'}
            >
              {store.isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
            <IconButton edge="end" color="primary">
              <DirectionsOutlinedIcon />
            </IconButton>
          </Stack>
        </ListItemSecondaryAction>
      </ListItem>
      <Divider component="li" />
    </>
  )
}

export default function StoreList({
  stores,
  selectedStore,
  onSelectStore,
  loading = false,
  viewMode = 'cards',
}: StoreListProps) {
  const handleToggleFavorite = (store: Store) => {
    // In a real app, this would update the backend
    console.log('Toggle favorite for store:', store.locationId)
  }

  if (loading) {
    return (
      <Grid container spacing={2}>
        {[1, 2, 3, 4].map((n) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={n}>
            <StoreCardSkeleton />
          </Grid>
        ))}
      </Grid>
    )
  }

  if (stores.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 4,
          textAlign: 'center',
          bgcolor: 'background.default',
        }}
      >
        <StoreOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Stores Found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try adjusting your search radius or ZIP code to find nearby stores.
        </Typography>
      </Paper>
    )
  }

  if (viewMode === 'list') {
    return (
      <Paper variant="outlined">
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {stores.map((store, index) => (
            <StoreListItem
              key={store.locationId}
              store={store}
              isSelected={selectedStore?.locationId === store.locationId}
              onSelect={() => onSelectStore(store)}
              onToggleFavorite={() => handleToggleFavorite(store)}
            />
          ))}
        </List>
      </Paper>
    )
  }

  return (
    <Grid container spacing={2}>
      {stores.map((store) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={store.locationId}>
          <StoreCard
            store={store}
            isSelected={selectedStore?.locationId === store.locationId}
            onSelect={() => onSelectStore(store)}
            onToggleFavorite={() => handleToggleFavorite(store)}
          />
        </Grid>
      ))}
    </Grid>
  )
}