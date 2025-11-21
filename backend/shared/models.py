"""
Pydantic models for request validation and data structures
"""
from pydantic import BaseModel, HttpUrl, Field, field_validator
from typing import Optional, List
from datetime import datetime


class CreateProfileRequest(BaseModel):
    """Request model for creating a user profile"""
    firstName: str = Field(..., min_length=1, max_length=50, description="User's first name")
    lastName: str = Field(..., min_length=1, max_length=50, description="User's last name")
    awsBuilderHandle: str = Field(..., min_length=1, max_length=50, description="AWS Builder Center handle")
    linkedInUsername: Optional[str] = Field(None, max_length=50, description="LinkedIn username (optional)")
    githubUsername: Optional[str] = Field(None, max_length=50, description="GitHub username (optional)")

    @field_validator('firstName', 'lastName', 'awsBuilderHandle')
    @classmethod
    def validate_required_fields(cls, v: str) -> str:
        """Ensure required fields are not empty or whitespace"""
        if not v or not v.strip():
            raise ValueError('Field cannot be empty or whitespace')
        return v.strip()

    @field_validator('linkedInUsername', 'githubUsername')
    @classmethod
    def validate_optional_fields(cls, v: Optional[str]) -> Optional[str]:
        """Strip whitespace from optional fields"""
        if v:
            return v.strip() if v.strip() else None
        return None


class UpdateProfileRequest(BaseModel):
    """Request model for updating a user profile"""
    firstName: str = Field(..., min_length=1, max_length=50, description="User's first name")
    lastName: str = Field(..., min_length=1, max_length=50, description="User's last name")
    awsBuilderHandle: str = Field(..., min_length=1, max_length=50, description="AWS Builder Center handle")
    linkedInUsername: Optional[str] = Field(None, max_length=50, description="LinkedIn username (optional)")
    githubUsername: Optional[str] = Field(None, max_length=50, description="GitHub username (optional)")

    @field_validator('firstName', 'lastName', 'awsBuilderHandle')
    @classmethod
    def validate_required_fields(cls, v: str) -> str:
        """Ensure required fields are not empty or whitespace"""
        if not v or not v.strip():
            raise ValueError('Field cannot be empty or whitespace')
        return v.strip()

    @field_validator('linkedInUsername', 'githubUsername')
    @classmethod
    def validate_optional_fields(cls, v: Optional[str]) -> Optional[str]:
        """Strip whitespace from optional fields"""
        if v:
            return v.strip() if v.strip() else None
        return None


class UserProfile(BaseModel):
    """User profile data model"""
    userId: str
    firstName: str
    lastName: str
    awsBuilderHandle: str
    linkedInUsername: Optional[str] = None
    githubUsername: Optional[str] = None
    createdAt: str
    updatedAt: str


class CreateApplicationRequest(BaseModel):
    """Request model for creating an application"""
    name: str = Field(..., min_length=1, max_length=100, description="Application name")
    description: str = Field(..., min_length=1, max_length=500, description="Application description")
    appUrl: Optional[HttpUrl] = Field(None, description="Live application URL (optional)")
    githubUrl: HttpUrl = Field(..., description="GitHub repository URL (required)")
    tags: List[str] = Field(..., min_length=1, max_length=10, description="Application tags")
    userId: Optional[str] = Field(None, description="User ID (for POC without Cognito)")
    
    model_config = {"extra": "ignore"}  # Ignore extra fields

    @field_validator('name', 'description')
    @classmethod
    def validate_text_fields(cls, v: str) -> str:
        """Ensure text fields are not empty or whitespace"""
        if not v or not v.strip():
            raise ValueError('Field cannot be empty or whitespace')
        return v.strip()

    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v: List[str]) -> List[str]:
        """Validate and clean tags"""
        if not v:
            raise ValueError('At least one tag is required')
        
        # Strip whitespace and filter empty tags
        cleaned_tags = [tag.strip() for tag in v if tag and tag.strip()]
        
        if not cleaned_tags:
            raise ValueError('At least one non-empty tag is required')
        
        if len(cleaned_tags) > 10:
            raise ValueError('Maximum 10 tags allowed')
        
        return cleaned_tags


class Application(BaseModel):
    """Application data model"""
    appId: str
    userId: str
    userName: str
    name: str
    description: str
    appUrl: Optional[str] = None
    githubUrl: Optional[str] = None
    tags: List[str]
    createdAt: str
