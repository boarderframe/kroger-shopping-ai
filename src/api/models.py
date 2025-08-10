"""
Pydantic models for Kroger API data structures.
"""
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime


class TokenResponse(BaseModel):
    """OAuth2 token response from Kroger API."""
    access_token: str
    token_type: str
    expires_in: int
    scope: str


class Address(BaseModel):
    """Store address information."""
    addressLine1: Optional[str] = None
    addressLine2: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    state: Optional[str] = None
    zipCode: Optional[str] = None


class Geolocation(BaseModel):
    """Geographic location data."""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    latLng: Optional[str] = None


class Department(BaseModel):
    """Store department information."""
    departmentId: str
    name: str
    phone: Optional[str] = None
    hours: Optional[Dict[str, Any]] = None


class Location(BaseModel):
    """Store location data."""
    locationId: str
    storeNumber: Optional[str] = None
    vanityName: Optional[str] = None
    divisionNumber: Optional[str] = None
    phone: Optional[str] = None
    showWeeklyAd: Optional[bool] = None
    showShopThisStore: Optional[bool] = None
    address: Address
    geolocation: Optional[Geolocation] = None
    pharmacyHours: Optional[Dict[str, Any]] = None
    hours: Optional[Dict[str, Any]] = None
    name: Optional[str] = None
    departments: Optional[List[Department]] = None


class AisleLocation(BaseModel):
    """Product aisle location in store."""
    bayNumber: Optional[str] = None
    description: Optional[str] = None
    number: Optional[str] = None
    numberOfFacings: Optional[int] = None
    side: Optional[str] = None
    shelfNumber: Optional[str] = None
    shelfPositionInBay: Optional[str] = None


class ImageSize(BaseModel):
    """Product image size variant."""
    size: str
    url: str


class Image(BaseModel):
    """Product image data."""
    perspective: Optional[str] = None
    featured: Optional[bool] = None
    sizes: Optional[List[ImageSize]] = None


class Fulfillment(BaseModel):
    """Product fulfillment options."""
    curbside: Optional[bool] = None
    delivery: Optional[bool] = None
    instore: Optional[bool] = None
    shiptohome: Optional[bool] = None


class Price(BaseModel):
    """Product pricing information."""
    regular: Optional[float] = None
    promo: Optional[float] = None
    regularPerUnitEstimate: Optional[float] = None
    promoPerUnitEstimate: Optional[float] = None


class Inventory(BaseModel):
    """Product inventory status."""
    stockLevel: Optional[Literal['LOW', 'HIGH', 'TEMPORARILY_OUT_OF_STOCK']] = None


class Item(BaseModel):
    """Product item variant (size/package)."""
    itemId: str
    favorite: Optional[bool] = None
    fulfillment: Optional[Fulfillment] = None
    price: Optional[Price] = None
    nationalPrice: Optional[Price] = None
    size: Optional[str] = None
    soldBy: Optional[str] = None
    inventory: Optional[Inventory] = None


class ItemInformation(BaseModel):
    """Product physical dimensions."""
    depth: Optional[str] = None
    height: Optional[str] = None
    width: Optional[str] = None


class Temperature(BaseModel):
    """Product temperature requirements."""
    indicator: Optional[str] = None
    heatSensitive: Optional[bool] = None


class Product(BaseModel):
    """Complete product information."""
    productId: str
    aisleLocations: Optional[List[AisleLocation]] = None
    brand: Optional[str] = None
    categories: Optional[List[str]] = None
    countryOrigin: Optional[str] = None
    description: Optional[str] = None
    images: Optional[List[Image]] = None
    items: Optional[List[Item]] = None
    itemInformation: Optional[ItemInformation] = None
    temperature: Optional[Temperature] = None
    upc: Optional[str] = None
    productPageURI: Optional[str] = None


class Chain(BaseModel):
    """Kroger chain/division information."""
    name: str
    divisionNumber: str
    domain: Optional[str] = None


class CartItem(BaseModel):
    """Shopping cart item."""
    upc: str
    quantity: Optional[int] = 1
    modality: Optional[Literal['PICKUP', 'DELIVERY', 'SHIP']] = 'PICKUP'


class UserProfile(BaseModel):
    """User profile data."""
    id: str


class LocationSearchParams(BaseModel):
    """Parameters for location search API."""
    filter_zipCode: Optional[str] = Field(None, alias='filter.zipCode')
    filter_lat: Optional[float] = Field(None, alias='filter.lat')
    filter_lon: Optional[float] = Field(None, alias='filter.lon')
    filter_radiusInMiles: Optional[int] = Field(None, alias='filter.radiusInMiles')
    filter_limit: Optional[int] = Field(None, alias='filter.limit')
    filter_chain: Optional[str] = Field(None, alias='filter.chain')
    filter_department: Optional[str] = Field(None, alias='filter.department')

    class Config:
        populate_by_name = True
        allow_population_by_field_name = True


class ProductSearchParams(BaseModel):
    """Parameters for product search API."""
    filter_term: Optional[str] = Field(None, alias='filter.term')
    filter_locationId: Optional[str] = Field(None, alias='filter.locationId')
    filter_productId: Optional[str] = Field(None, alias='filter.productId')
    filter_brand: Optional[str] = Field(None, alias='filter.brand')
    filter_fulfillment: Optional[str] = Field(None, alias='filter.fulfillment')
    filter_limit: Optional[int] = Field(50, alias='filter.limit')
    filter_start: Optional[int] = Field(0, alias='filter.start')

    class Config:
        populate_by_name = True
        allow_population_by_field_name = True


class Pagination(BaseModel):
    """API pagination metadata."""
    total: int
    start: int
    limit: int


class Meta(BaseModel):
    """API response metadata."""
    pagination: Pagination


class ProductSearchResponse(BaseModel):
    """Product search API response."""
    data: List[Product]
    meta: Meta


class LocationSearchResponse(BaseModel):
    """Location search API response."""
    data: List[Location]
    meta: Optional[Meta] = None


class CartResponse(BaseModel):
    """Shopping cart API response."""
    items: List[CartItem]
    total: Optional[float] = None


# Helper models for UI components
class ProductDisplay(BaseModel):
    """Processed product data for UI display."""
    product_id: str
    name: str
    brand: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[float] = None
    sale_price: Optional[float] = None
    size: Optional[str] = None
    unit_price: Optional[str] = None
    in_stock: bool = True
    aisle: Optional[str] = None
    
    @classmethod
    def from_product(cls, product: Product) -> Optional['ProductDisplay']:
        """Convert API Product to display format."""
        if not product.items:
            return None
            
        # Get first item (or item with best price)
        item = product.items[0]
        
        # Get image URL
        image_url = None
        if product.images:
            for img in product.images:
                if img.sizes:
                    # Prefer medium size
                    for size in img.sizes:
                        if size.size == 'medium':
                            image_url = size.url
                            break
                    if not image_url:
                        image_url = img.sizes[0].url
                        
        # Get aisle location
        aisle = None
        if product.aisleLocations:
            loc = product.aisleLocations[0]
            aisle = f"Aisle {loc.number}" if loc.number else loc.description
            
        # Calculate unit price display
        unit_price = None
        if item.price:
            if item.price.promoPerUnitEstimate:
                unit_price = f"${item.price.promoPerUnitEstimate:.2f}/unit"
            elif item.price.regularPerUnitEstimate:
                unit_price = f"${item.price.regularPerUnitEstimate:.2f}/unit"
                
        return cls(
            product_id=product.productId,
            name=product.description or "Unknown Product",
            brand=product.brand,
            description=product.description,
            image_url=image_url,
            price=item.price.regular if item.price else None,
            sale_price=item.price.promo if item.price else None,
            size=item.size,
            unit_price=unit_price,
            in_stock=item.inventory.stockLevel != 'TEMPORARILY_OUT_OF_STOCK' if item.inventory else True,
            aisle=aisle
        )


class StoreDisplay(BaseModel):
    """Processed store data for UI display."""
    location_id: str
    name: str
    address: str
    distance: Optional[float] = None
    phone: Optional[str] = None
    
    @classmethod
    def from_location(cls, location: Location) -> 'StoreDisplay':
        """Convert API Location to display format."""
        addr_parts = []
        if location.address.addressLine1:
            addr_parts.append(location.address.addressLine1)
        if location.address.city:
            addr_parts.append(location.address.city)
        if location.address.state:
            addr_parts.append(location.address.state)
        if location.address.zipCode:
            addr_parts.append(location.address.zipCode)
            
        address = ", ".join(addr_parts)
        
        return cls(
            location_id=location.locationId,
            name=location.name or f"Store #{location.storeNumber}" or "Kroger Store",
            address=address,
            phone=location.phone
        )