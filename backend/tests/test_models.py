"""
Tests for Pydantic models
"""
import pytest
from pydantic import ValidationError
from shared.models import (
    CreateProfileRequest,
    UpdateProfileRequest,
    CreateApplicationRequest,
    UserProfile,
    Application
)


class TestCreateProfileRequest:
    """Tests for CreateProfileRequest model"""
    
    def test_valid_profile_with_all_fields(self):
        """Test creating profile with all fields"""
        profile = CreateProfileRequest(
            firstName="John",
            lastName="Doe",
            awsBuilderHandle="johndoe",
            linkedInUsername="johndoe",
            githubUsername="johndoe"
        )
        assert profile.firstName == "John"
        assert profile.lastName == "Doe"
        assert profile.awsBuilderHandle == "johndoe"
        assert profile.linkedInUsername == "johndoe"
        assert profile.githubUsername == "johndoe"
    
    def test_valid_profile_with_required_fields_only(self):
        """Test creating profile with only required fields"""
        profile = CreateProfileRequest(
            firstName="John",
            lastName="Doe",
            awsBuilderHandle="johndoe"
        )
        assert profile.firstName == "John"
        assert profile.lastName == "Doe"
        assert profile.awsBuilderHandle == "johndoe"
        assert profile.linkedInUsername is None
        assert profile.githubUsername is None
    
    def test_missing_required_field(self):
        """Test that missing required fields raise validation error"""
        with pytest.raises(ValidationError) as exc_info:
            CreateProfileRequest(
                firstName="John",
                lastName="Doe"
                # Missing awsBuilderHandle
            )
        errors = exc_info.value.errors()
        assert any(e['loc'] == ('awsBuilderHandle',) for e in errors)
    
    def test_empty_required_field(self):
        """Test that empty required fields raise validation error"""
        with pytest.raises(ValidationError) as exc_info:
            CreateProfileRequest(
                firstName="",
                lastName="Doe",
                awsBuilderHandle="johndoe"
            )
        errors = exc_info.value.errors()
        assert any('firstName' in str(e['loc']) for e in errors)
    
    def test_whitespace_only_required_field(self):
        """Test that whitespace-only required fields raise validation error"""
        with pytest.raises(ValidationError) as exc_info:
            CreateProfileRequest(
                firstName="   ",
                lastName="Doe",
                awsBuilderHandle="johndoe"
            )
        errors = exc_info.value.errors()
        assert any('firstName' in str(e['loc']) for e in errors)
    
    def test_fields_are_trimmed(self):
        """Test that fields are trimmed of whitespace"""
        profile = CreateProfileRequest(
            firstName="  John  ",
            lastName="  Doe  ",
            awsBuilderHandle="  johndoe  "
        )
        assert profile.firstName == "John"
        assert profile.lastName == "Doe"
        assert profile.awsBuilderHandle == "johndoe"


class TestUpdateProfileRequest:
    """Tests for UpdateProfileRequest model"""
    
    def test_valid_update(self):
        """Test valid profile update"""
        profile = UpdateProfileRequest(
            firstName="Jane",
            lastName="Smith",
            awsBuilderHandle="janesmith",
            linkedInUsername="janesmith"
        )
        assert profile.firstName == "Jane"
        assert profile.lastName == "Smith"
        assert profile.awsBuilderHandle == "janesmith"
        assert profile.linkedInUsername == "janesmith"


class TestCreateApplicationRequest:
    """Tests for CreateApplicationRequest model"""
    
    def test_valid_application_with_all_fields(self):
        """Test creating application with all fields"""
        app = CreateApplicationRequest(
            name="My App",
            description="A great app",
            appUrl="https://example.com",
            githubUrl="https://github.com/user/repo",
            tags=["tag1", "tag2"]
        )
        assert app.name == "My App"
        assert app.description == "A great app"
        assert str(app.appUrl) == "https://example.com/"
        assert str(app.githubUrl) == "https://github.com/user/repo"
        assert app.tags == ["tag1", "tag2"]
    
    def test_valid_application_without_github(self):
        """Test creating application without GitHub URL"""
        app = CreateApplicationRequest(
            name="My App",
            description="A great app",
            appUrl="https://example.com",
            tags=["tag1"]
        )
        assert app.name == "My App"
        assert app.githubUrl is None
    
    def test_missing_required_field(self):
        """Test that missing required fields raise validation error"""
        with pytest.raises(ValidationError) as exc_info:
            CreateApplicationRequest(
                name="My App",
                description="A great app",
                appUrl="https://example.com"
                # Missing tags
            )
        errors = exc_info.value.errors()
        assert any(e['loc'] == ('tags',) for e in errors)
    
    def test_empty_tags_list(self):
        """Test that empty tags list raises validation error"""
        with pytest.raises(ValidationError) as exc_info:
            CreateApplicationRequest(
                name="My App",
                description="A great app",
                appUrl="https://example.com",
                tags=[]
            )
        errors = exc_info.value.errors()
        assert any('tags' in str(e['loc']) for e in errors)
    
    def test_invalid_url_format(self):
        """Test that invalid URL format raises validation error"""
        with pytest.raises(ValidationError) as exc_info:
            CreateApplicationRequest(
                name="My App",
                description="A great app",
                appUrl="not-a-valid-url",
                tags=["tag1"]
            )
        errors = exc_info.value.errors()
        assert any('appUrl' in str(e['loc']) for e in errors)
    
    def test_tags_are_cleaned(self):
        """Test that tags are cleaned of whitespace"""
        app = CreateApplicationRequest(
            name="My App",
            description="A great app",
            appUrl="https://example.com",
            tags=["  tag1  ", "tag2", "  ", "tag3"]
        )
        # Empty tags should be filtered out
        assert "tag1" in app.tags
        assert "tag2" in app.tags
        assert "tag3" in app.tags
        assert len(app.tags) == 3
    
    def test_too_many_tags(self):
        """Test that more than 10 tags raises validation error"""
        with pytest.raises(ValidationError) as exc_info:
            CreateApplicationRequest(
                name="My App",
                description="A great app",
                appUrl="https://example.com",
                tags=[f"tag{i}" for i in range(11)]
            )
        errors = exc_info.value.errors()
        assert any('tags' in str(e['loc']) for e in errors)
