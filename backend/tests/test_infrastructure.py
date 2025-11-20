"""
Basic infrastructure tests to verify setup
"""
import pytest


def test_python_version():
    """Verify Python version is 3.13+"""
    import sys
    assert sys.version_info >= (3, 13), "Python 3.13+ required"


def test_boto3_import():
    """Verify boto3 can be imported"""
    import boto3
    assert boto3.__version__


def test_pydantic_import():
    """Verify pydantic can be imported"""
    import pydantic
    assert pydantic.__version__
